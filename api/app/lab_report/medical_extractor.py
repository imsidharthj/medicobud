"""
Medical Entity Extraction Module
Handles medical entity extraction using Biomedical NER (primary) and MedCAT (secondary) with local model caching
"""

import os
import re
import logging
import torch
from typing import Dict, List, Any, Optional, Tuple
import spacy
import json
from pathlib import Path

# Transformers for biomedical NER
from transformers import (
    AutoTokenizer, 
    AutoModelForTokenClassification, 
    TokenClassificationPipeline,
    pipeline
)

# MedCAT imports (secondary model)
try:
    from medcat.cat import CAT
    from medcat.vocab import Vocab
    from medcat.cdb import CDB
    from medcat.config import Config
    MEDCAT_AVAILABLE = True
except ImportError:
    MEDCAT_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SystemCapabilities:
    """Detect and manage system capabilities (GPU/CPU)"""
    
    def __init__(self):
        self.has_gpu = torch.cuda.is_available()
        self.device = "cuda" if self.has_gpu else "cpu"
        self.gpu_memory = None
        
        if self.has_gpu:
            self.gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            logger.info(f"GPU detected: {torch.cuda.get_device_name(0)} ({self.gpu_memory:.1f}GB)")
        else:
            logger.info("No GPU detected. Using CPU for processing.")
    
    def get_optimal_batch_size(self) -> int:
        """Get optimal batch size based on available memory"""
        if self.has_gpu and self.gpu_memory:
            if self.gpu_memory >= 8:
                return 32
            elif self.gpu_memory >= 4:
                return 16
            else:
                return 8
        return 4

class MedicalEntityExtractor:
    """Medical entity extraction with Biomedical NER (primary) and MedCAT (secondary) with local model caching"""
    
    def __init__(self, system_caps: Optional[SystemCapabilities] = None):
        self.system_caps = system_caps or SystemCapabilities()
        self.device = self.system_caps.device
        
        # Model storage paths
        self.models_dir = os.path.join(os.path.dirname(__file__), "cached_models")
        self.biomedical_model_dir = os.path.join(self.models_dir, "biomedical_ner")
        self.medcat_model_dir = os.path.join(os.path.dirname(__file__), "MedCat_model", "medcat_model_pack")
        
        # Ensure directories exist
        os.makedirs(self.biomedical_model_dir, exist_ok=True)
        os.makedirs(self.medcat_model_dir, exist_ok=True)
        
        self._init_models()
    
    def _init_models(self):
        """Initialize NLP models with conditional loading - MedCAT only loads if Biomedical NER fails"""
        try:
            # Load spaCy model
            try:
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("✅ Loaded spaCy en_core_web_sm model")
            except OSError:
                logger.warning("⚠️ spaCy model not found. Install with: python -m spacy download en_core_web_sm")
                self.nlp = None
            
            # Initialize Biomedical NER model (PRIMARY)
            self.biomedical_ner = self._load_cached_biomedical_ner()
            if self.biomedical_ner:
                logger.info(f"✅ Biomedical NER model loaded successfully on {self.device}")
                self.medcat = None
                logger.info("📋 MedCAT not loaded - Biomedical NER is primary model")
            else:
                logger.warning("⚠️ Biomedical NER model not available. Loading MedCAT as fallback...")
                if MEDCAT_AVAILABLE:
                    self.medcat = self._load_cached_medcat()
                    if self.medcat:
                        logger.info("✅ MedCAT model loaded successfully as fallback")
                    else:
                        logger.warning("⚠️ MedCAT model also not available.")
                else:
                    logger.warning("⚠️ MedCAT library not found. No medical entity extraction available.")
                    self.medcat = None
                
        except Exception as e:
            logger.error(f"❌ Error initializing models: {e}")
            self.biomedical_ner = None
            self.medcat = None

    def _lazy_load_medcat_if_needed(self) -> bool:
        """Lazy load MedCAT only if Biomedical NER produces insufficient results"""
        if self.medcat is not None:
            return True
            
        if not MEDCAT_AVAILABLE:
            logger.warning("⚠️ MedCAT not available for lazy loading")
            return False
        
        try:
            logger.info("🔄 Lazy loading MedCAT as fallback for insufficient results...")
            self.medcat = self._load_cached_medcat()
            if self.medcat:
                logger.info("✅ MedCAT lazy loaded successfully")
                return True
            else:
                logger.warning("⚠️ MedCAT lazy loading failed")
                return False
        except Exception as e:
            logger.error(f"❌ MedCAT lazy loading error: {e}")
            return False

    def _load_cached_biomedical_ner(self) -> Optional[TokenClassificationPipeline]:
        """Load biomedical NER model with local caching"""
        try:
            cached_model_path = os.path.join(self.biomedical_model_dir, "model")
            cached_tokenizer_path = os.path.join(self.biomedical_model_dir, "tokenizer")
            cached_config_path = os.path.join(self.biomedical_model_dir, "config.json")
            
            if (os.path.exists(cached_model_path) and 
                os.path.exists(cached_tokenizer_path) and 
                os.path.exists(cached_config_path)):
                
                logger.info("📦 Loading cached Biomedical NER model...")
                
                try:
                    with open(cached_config_path, 'r') as f:
                        config = json.load(f)
                    
                    tokenizer = AutoTokenizer.from_pretrained(cached_tokenizer_path)
                    model = AutoModelForTokenClassification.from_pretrained(cached_model_path)
                    
                    ner_pipeline = pipeline(
                        "ner",
                        model=model,
                        tokenizer=tokenizer,
                        device=0 if self.device == "cuda" else -1,
                        aggregation_strategy="simple",
                        ignore_labels=[]
                    )
                    
                    logger.info(f"✅ Successfully loaded cached model: {config.get('model_name', 'unknown')}")
                    return ner_pipeline
                
                except Exception as cache_error:
                    logger.warning(f"⚠️ Failed to load cached model: {cache_error}")
            
            logger.info("📥 Downloading and caching new Biomedical NER model...")
            return self._download_and_cache_biomedical_ner()
            
        except Exception as e:
            logger.error(f"❌ Error loading biomedical NER model: {e}")
            return None
    
    def _download_and_cache_biomedical_ner(self) -> Optional[TokenClassificationPipeline]:
        """Download and cache biomedical NER model locally"""
        try:
            if self.system_caps.has_gpu and self.system_caps.gpu_memory and self.system_caps.gpu_memory >= 4:
                model_name = "dmis-lab/biobert-v1.1-base-cased-ner"
                logger.info("📥 Downloading BioBERT NER model (GPU optimized)")
            else:
                model_name = "d4data/biomedical-ner-all"
                logger.info("📥 Downloading Biomedical NER model (CPU/limited GPU optimized)")
            
            try:
                tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = AutoModelForTokenClassification.from_pretrained(model_name)
                
                model_cache_path = os.path.join(self.biomedical_model_dir, "model")
                tokenizer_cache_path = os.path.join(self.biomedical_model_dir, "tokenizer")
                config_cache_path = os.path.join(self.biomedical_model_dir, "config.json")
                
                model.save_pretrained(model_cache_path)
                tokenizer.save_pretrained(tokenizer_cache_path)
                
                config = {
                    "model_name": model_name,
                    "device": self.device,
                    "cached_date": str(torch.utils.data.get_worker_info())
                }
                
                with open(config_cache_path, 'w') as f:
                    json.dump(config, f, indent=2)
                
                ner_pipeline = pipeline(
                    "ner",
                    model=model,
                    tokenizer=tokenizer,
                    device=0 if self.device == "cuda" else -1,
                    aggregation_strategy="simple",
                    ignore_labels=[]
                )
                
                logger.info(f"✅ Successfully downloaded and cached {model_name}")
                return ner_pipeline
                
            except Exception as model_error:
                logger.warning(f"⚠️ Primary biomedical model failed: {model_error}")
                
                try:
                    fallback_model = "allenai/scibert_scivocab_uncased"
                    logger.info(f"📥 Trying fallback model: {fallback_model}")
                    
                    tokenizer = AutoTokenizer.from_pretrained(fallback_model)
                    model = AutoModelForTokenClassification.from_pretrained(fallback_model)
                    
                    model.save_pretrained(os.path.join(self.biomedical_model_dir, "model"))
                    tokenizer.save_pretrained(os.path.join(self.biomedical_model_dir, "tokenizer"))
                    
                    config = {"model_name": fallback_model, "device": self.device}
                    with open(os.path.join(self.biomedical_model_dir, "config.json"), 'w') as f:
                        json.dump(config, f, indent=2)
                    
                    ner_pipeline = pipeline(
                        "ner",
                        model=model,
                        tokenizer=tokenizer,
                        device=0 if self.device == "cuda" else -1,
                        aggregation_strategy="simple"
                    )
                    
                    logger.info(f"✅ Successfully cached fallback model: {fallback_model}")
                    return ner_pipeline
                    
                except Exception as fallback_error:
                    logger.error(f"❌ Fallback model also failed: {fallback_error}")
                    return None
            
        except Exception as e:
            logger.error(f"❌ Error downloading biomedical NER model: {e}")
            return None
    
    def _load_cached_medcat(self) -> Optional['CAT']:
        """Load MedCAT model with caching (secondary model)"""
        try:
            cdb_path = os.path.join(self.medcat_model_dir, "cdb.dat")
            vocab_path = os.path.join(self.medcat_model_dir, "vocab.dat")
            
            if os.path.exists(cdb_path) and os.path.exists(vocab_path):
                logger.info("📦 Loading cached MedCAT model...")
                
                try:
                    cdb = CDB.load(cdb_path)
                    vocab = Vocab.load(vocab_path)
                    
                    config = Config()
                    config.general = {"spacy_model": "en_core_web_sm"}
                    
                    cat = CAT(cdb=cdb, config=config, vocab=vocab)
                    logger.info("✅ MedCAT loaded from cache successfully")
                    return cat
                    
                except Exception as cache_error:
                    logger.warning(f"⚠️ Failed to load cached MedCAT: {cache_error}")
                    return None
            else:
                logger.info("📥 No cached MedCAT model found. MedCAT will be built on first SNOMED use.")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error loading cached MedCAT: {e}")
            return None
    
    def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract medical entities using Biomedical NER (primary) with conditional MedCAT fallback"""
        entities = {
            "medical_entities": [],
            "lab_values": {},
            "spacy_entities": [],
            "quantities": [],
            "processing_info": {
                "primary_model": "biomedical_ner" if self.biomedical_ner else "medcat",
                "secondary_model": "none",
                "biomedical_ner_available": self.biomedical_ner is not None,
                "medcat_available": self.medcat is not None,
                "medcat_lazy_loaded": False,
                "spacy_available": self.nlp is not None,
                "device_used": self.device
            }
        }
        
        try:
            # PRIMARY: Biomedical NER extraction
            if self.biomedical_ner:
                try:
                    logger.info("🔬 Processing with Biomedical NER (primary)...")
                    biomedical_entities = self._extract_with_biomedical_ner(text)
                    entities["medical_entities"].extend(biomedical_entities)
                    logger.info(f"✅ Biomedical NER extracted {len(biomedical_entities)} entities")
                    
                    insufficient_results = len(biomedical_entities) < 3 and len(text) > 100
                    
                    if insufficient_results:
                        logger.info("🔄 Biomedical NER results insufficient, considering MedCAT fallback...")
                        if self._lazy_load_medcat_if_needed():
                            entities["processing_info"]["medcat_lazy_loaded"] = True
                            entities["processing_info"]["secondary_model"] = "medcat"
                    
                except Exception as e:
                    logger.error(f"❌ Biomedical NER processing failed: {e}")
                    if self._lazy_load_medcat_if_needed():
                        entities["processing_info"]["medcat_lazy_loaded"] = True
                        entities["processing_info"]["secondary_model"] = "medcat"
            
            # CONDITIONAL SECONDARY: MedCAT extraction
            if self.medcat:
                try:
                    logger.info("🧠 Processing with MedCAT (conditional fallback)...")
                    medcat_entities = self._extract_with_medcat(text)
                    
                    existing_texts = {e["text"].lower() for e in entities["medical_entities"]}
                    new_entities = [e for e in medcat_entities if e["text"].lower() not in existing_texts]
                    
                    entities["medical_entities"].extend(new_entities)
                    entities["processing_info"]["secondary_model"] = "medcat"
                    logger.info(f"✅ MedCAT added {len(new_entities)} additional entities")
                    
                except Exception as e:
                    logger.error(f"❌ MedCAT processing failed: {e}")
            
            # FALLBACK: Regex extraction
            if not entities["medical_entities"]:
                logger.info("📝 Using regex fallback extraction...")
                entities["medical_entities"] = self._extract_medical_entities_regex(text)
                logger.info(f"✅ Regex extracted {len(entities['medical_entities'])} entities")
            
            # spaCy NER extraction
            if self.nlp:
                try:
                    doc = self.nlp(text)
                    entities["spacy_entities"] = [
                        {
                            "text": ent.text,
                            "label": ent.label_,
                            "start": ent.start_char,
                            "end": ent.end_char,
                            "description": spacy.explain(ent.label_) or ""
                        }
                        for ent in doc.ents
                    ]
                    
                    entities["quantities"] = [
                        ent.text for ent in doc.ents 
                        if ent.label_ in ["QUANTITY", "CARDINAL", "PERCENT"]
                    ]
                    
                    logger.info(f"✅ spaCy extracted {len(entities['spacy_entities'])} general entities")
                    
                except Exception as e:
                    logger.error(f"❌ spaCy processing failed: {e}")
            
            entities["lab_values"] = self._extract_lab_values(text)
            logger.info(f"✅ Extracted {len(entities['lab_values'])} lab value types")
            
            entities = self._post_process_entities(entities)
            
        except Exception as e:
            logger.error(f"❌ Error extracting entities: {e}")
        
        return entities
    
    def _extract_with_biomedical_ner(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities using Biomedical NER model"""
        entities = []
        
        try:
            max_length = 500
            text_chunks = self._split_text(text, max_length)
            
            for chunk in text_chunks:
                if len(chunk.strip()) < 10:
                    continue
                    
                ner_results = self.biomedical_ner(chunk)
                
                for entity in ner_results:
                    entity_data = {
                        "text": entity["word"].replace("##", ""),
                        "label": [entity.get("entity_group", entity.get("label", ""))],
                        "confidence": float(entity.get("score", 0.0)),
                        "start": int(entity.get("start", 0)),
                        "end": int(entity.get("end", 0)),
                        "cui": "",
                        "description": self._get_biomedical_entity_description(entity),
                        "category": self._categorize_biomedical_entity(entity),
                        "source": "biomedical_ner"
                    }
                    entities.append(entity_data)
        
        except Exception as e:
            logger.error(f"❌ Biomedical NER extraction failed: {e}")
        
        return entities
    
    def _extract_with_medcat(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities using MedCAT model"""
        entities = []
        
        try:
            doc = self.medcat(text)
            
            if hasattr(doc, 'ents') and doc.ents:
                for ent in doc.ents:
                    entity_data = {
                        "text": ent.text,
                        "label": [getattr(ent._, 'cui', '')],
                        "confidence": float(getattr(ent._, 'confidence', 0.9)),
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "cui": getattr(ent._, 'cui', ''),
                        "description": getattr(ent._, 'pretty_name', ent.text),
                        "category": self._categorize_medical_entity_from_cui(getattr(ent._, 'cui', '')),
                        "source": "medcat"
                    }
                    entities.append(entity_data)
            else:
                entities = self._manual_entity_detection(text)
                for entity in entities:
                    entity["source"] = "medcat_manual"
        
        except Exception as e:
            logger.error(f"❌ MedCAT extraction failed: {e}")
        
        return entities

    def _split_text(self, text: str, max_length: int) -> List[str]:
        """Split text into chunks for transformer processing"""
        if len(text) <= max_length:
            return [text]
        
        sentences = re.split(r'[.!?]+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) <= max_length:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _get_biomedical_entity_description(self, entity: dict) -> str:
        """Get description for biomedical entity"""
        label = entity.get("entity_group", entity.get("label", ""))
        
        descriptions = {
            "CHEMICAL": "Chemical compound or substance",
            "DISEASE": "Disease or medical condition", 
            "SPECIES": "Biological species",
            "GENE": "Gene or genetic element",
            "PROTEIN": "Protein or enzyme",
            "DRUG": "Medication or pharmaceutical compound",
            "ANATOMY": "Anatomical structure or body part",
            "PROCEDURE": "Medical procedure or treatment",
            "LAB_TEST": "Laboratory test or assay"
        }
        
        return descriptions.get(label.upper(), f"Biomedical entity: {label}")
    
    def _categorize_biomedical_entity(self, entity: dict) -> str:
        """Categorize biomedical entity based on its label"""
        label = entity.get("entity_group", entity.get("label", "")).upper()
        
        category_mapping = {
            "CHEMICAL": "medication",
            "DRUG": "medication",
            "DISEASE": "condition", 
            "GENE": "anatomy",
            "PROTEIN": "lab_test",
            "ANATOMY": "anatomy",
            "PROCEDURE": "procedure",
            "LAB_TEST": "lab_test"
        }
        
        return category_mapping.get(label, "other")
    
    def _manual_entity_detection(self, text: str) -> List[Dict[str, Any]]:
        """Manually detect entities using MedCAT's CDB"""
        entities = []
        
        try:
            if not self.medcat or not hasattr(self.medcat, 'cdb'):
                return entities
            
            cdb = self.medcat.cdb
            text_lower = text.lower()
            
            for cui, names in cdb.cui2names.items():
                for name in names:
                    if len(name) < 3:
                        continue
                    
                    if name in text_lower:
                        start_pos = 0
                        while True:
                            pos = text_lower.find(name, start_pos)
                            if pos == -1:
                                break
                            
                            is_word_boundary_start = (pos == 0 or not text[pos-1].isalnum())
                            is_word_boundary_end = (pos + len(name) >= len(text) or not text[pos + len(name)].isalnum())
                            
                            if is_word_boundary_start and is_word_boundary_end:
                                original_text = text[pos:pos + len(name)]
                                
                                entity_data = {
                                    "text": original_text,
                                    "label": [cui],
                                    "confidence": 0.95,
                                    "start": pos,
                                    "end": pos + len(name),
                                    "cui": cui,
                                    "description": f"SNOMED CT: {original_text}",
                                    "category": self._categorize_medical_entity_from_cui(cui),
                                    "source": "medcat_manual"
                                }
                                entities.append(entity_data)
                            
                            start_pos = pos + 1
            
            unique_entities = []
            seen = set()
            for entity in entities:
                key = (entity['text'].lower(), entity['start'], entity['end'])
                if key not in seen:
                    seen.add(key)
                    unique_entities.append(entity)
            
            return unique_entities
            
        except Exception as e:
            logger.error(f"❌ Manual entity detection failed: {e}")
            return entities
    
    def _categorize_medical_entity_from_cui(self, cui: str) -> str:
        """Enhanced categorization for SNOMED concepts based on CUI patterns and terms"""
        if cui.startswith('S') and self.medcat and hasattr(self.medcat, 'cdb'):
            try:
                cdb = self.medcat.cdb
                if cui in cdb.cui2names:
                    names = list(cdb.cui2names[cui])
                    combined_terms = ' '.join(names).lower()
                    
                    if any(term in combined_terms for term in [
                        'glucose', 'hemoglobin', 'cholesterol', 'creatinine', 'bun', 
                        'sodium', 'potassium', 'chloride', 'albumin', 'bilirubin',
                        'wbc', 'rbc', 'platelets', 'hematocrit', 'tsh', 'alt', 'ast',
                        'test', 'level', 'count', 'measurement', 'assay', 'panel'
                    ]):
                        return 'lab_test'
                    elif any(term in combined_terms for term in [
                        'diabetes', 'hypertension', 'anemia', 'disease', 'disorder',
                        'syndrome', 'condition', 'infection', 'inflammation', 'cancer'
                    ]):
                        return 'condition'
                    elif any(term in combined_terms for term in [
                        'heart', 'liver', 'kidney', 'lung', 'brain', 'blood', 'bone',
                        'muscle', 'nerve', 'organ', 'tissue', 'cell', 'artery', 'vein'
                    ]):
                        return 'anatomy'
                    elif any(term in combined_terms for term in [
                        'medication', 'drug', 'medicine', 'tablet', 'capsule', 'injection'
                    ]):
                        return 'medication'
                    elif any(term in combined_terms for term in [
                        'procedure', 'surgery', 'operation', 'biopsy', 'scan', 'x-ray'
                    ]):
                        return 'procedure'
                    else:
                        return 'medical_concept'
            except Exception:
                return 'medical_concept'
        
        return 'other'
    
    def _post_process_entities(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Post-process entities to remove duplicates and enhance quality"""
        seen_entities = set()
        unique_medical_entities = []
        
        for entity in entities["medical_entities"]:
            entity_key = (entity["text"].lower(), tuple(entity["label"]))
            if entity_key not in seen_entities:
                seen_entities.add(entity_key)
                unique_medical_entities.append(entity)
        
        entities["medical_entities"] = unique_medical_entities
        
        for test_name, values in entities["lab_values"].items():
            for entity in entities["medical_entities"]:
                if test_name.lower() in entity["text"].lower() or entity["text"].lower() in test_name.lower():
                    entity["category"] = "lab_test"
        
        return entities
    
    def _extract_medical_entities_regex(self, text: str) -> List[Dict[str, Any]]:
        """Extract medical entities using regex patterns (fallback method)"""
        entities = []
        
        medical_patterns = {
            "lab_tests": r'\b(glucose|hemoglobin|cholesterol|creatinine|bun|wbc|rbc|platelets|sodium|potassium|chloride|tsh|alt|ast|hdl|ldl|triglycerides|hematocrit|albumin|bilirubin|calcium|phosphorus|magnesium|urea|protein|globulin)\b',
            "units": r'\b(mg/dL|g/dL|mEq/L|mmol/L|U/L|IU/L|μL|uL|mIU/L|%|percent|K/uL|M/uL|ng/mL|pg/mL|pmol/L|μmol/L|umol/L)\b',
            "medical_terms": r'\b(blood|urine|serum|plasma|test|level|count|range|normal|abnormal|high|low|elevated|decreased|CBC|chemistry|panel|lipid|thyroid|liver|kidney|cardiac|metabolic)\b',
            "conditions": r'\b(diabetes|hypertension|hyperlipidemia|anemia|leukemia|infection|inflammation|kidney\s+disease|liver\s+disease|heart\s+disease)\b',
            "anatomy": r'\b(heart|liver|kidney|lung|brain|blood|bone|muscle|nerve|artery|vein|cell|tissue)\b'
        }
        
        for category, pattern in medical_patterns.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entity = {
                    "text": match.group(),
                    "label": [category],
                    "confidence": 0.8,
                    "start": match.start(),
                    "end": match.end(),
                    "cui": "",
                    "description": f"Regex-matched {category}",
                    "category": self._map_regex_category(category),
                    "source": "regex"
                }
                entities.append(entity)
        
        return entities
    
    def _map_regex_category(self, regex_category: str) -> str:
        """Map regex categories to our standard categories"""
        mapping = {
            "lab_tests": "lab_test",
            "units": "measurement", 
            "medical_terms": "other",
            "conditions": "condition",
            "anatomy": "anatomy"
        }
        return mapping.get(regex_category, "other")
    
    def _extract_lab_values(self, text: str) -> Dict[str, List[Tuple[str, str]]]:
        """Extract common lab values using enhanced regex patterns"""
        lab_patterns = {
            'glucose': r'glucose[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'hemoglobin': r'h[ae]moglobin[:\s]*(\d+\.?\d*)\s*(g/dL|g/L|g/dl)',
            'hematocrit': r'hematocrit[:\s]*(\d+\.?\d*)\s*(%|percent)',
            'cholesterol': r'cholesterol[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'hdl': r'hdl[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'ldl': r'ldl[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'triglycerides': r'triglycerides?[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'creatinine': r'creatinine[:\s]*(\d+\.?\d*)\s*(mg/dL|μmol/L|mg/dl|umol/L)',
            'bun': r'(?:bun|blood\s+urea\s+nitrogen)[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'wbc': r'(?:wbc|white\s+blood\s+cell(?:s)?)[:\s]*(\d+\.?\d*)\s*(×10³/μL|K/uL|x10\^3/uL|/uL|thou/uL|K/µL)',
            'rbc': r'(?:rbc|red\s+blood\s+cell(?:s)?)[:\s]*(\d+\.?\d*)\s*(×10⁶/μL|M/uL|x10\^6/uL|/uL|mill/uL|M/µL)',
            'platelets': r'platelets?[:\s]*(\d+\.?\d*)\s*(×10³/μL|K/uL|x10\^3/uL|/uL|thou/uL|K/µL)',
            'sodium': r'sodium[:\s]*(\d+\.?\d*)\s*(mEq/L|mmol/L|meq/L)',
            'potassium': r'potassium[:\s]*(\d+\.?\d*)\s*(mEq/L|mmol/L|meq/L)',
            'chloride': r'chloride[:\s]*(\d+\.?\d*)\s*(mEq/L|mmol/L|meq/L)',
            'tsh': r'(?:tsh|thyroid\s+stimulating\s+hormone)[:\s]*(\d+\.?\d*)\s*(mIU/L|uIU/mL|miu/L)',
            'alt': r'(?:alt|alanine\s+aminotransferase)[:\s]*(\d+\.?\d*)\s*(U/L|IU/L|u/L)',
            'ast': r'(?:ast|aspartate\s+aminotransferase)[:\s]*(\d+\.?\d*)\s*(U/L|IU/L|u/L)',
            'albumin': r'albumin[:\s]*(\d+\.?\d*)\s*(g/dL|g/L|g/dl)',
            'bilirubin': r'bilirubin[:\s]*(\d+\.?\d*)\s*(mg/dL|μmol/L|mg/dl)',
            'calcium': r'calcium[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'phosphorus': r'phosphorus[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'magnesium': r'magnesium[:\s]*(\d+\.?\d*)\s*(mg/dL|mmol/L|mg/dl)',
            'protein': r'(?:total\s+)?protein[:\s]*(\d+\.?\d*)\s*(g/dL|g/L|g/dl)',
            'globulin': r'globulin[:\s]*(\d+\.?\d*)\s*(g/dL|g/L|g/dl)'
        }
        
        extracted_values = {}
        text_lower = text.lower()
        
        for test_name, pattern in lab_patterns.items():
            matches = re.findall(pattern, text_lower, re.IGNORECASE | re.MULTILINE)
            valid_matches = [(value, unit) for value, unit in matches if value.strip()]
            if valid_matches:
                extracted_values[test_name] = valid_matches
        
        return extracted_values

    def get_reference_ranges(self, test_name: str) -> Dict[str, Any]:
        """Get reference ranges for common lab tests"""
        reference_ranges = {
            'glucose': {'min': 70, 'max': 110, 'unit': 'mg/dL', 'critical_low': 50, 'critical_high': 400},
            'hemoglobin': {'min': 12, 'max': 16, 'unit': 'g/dL', 'critical_low': 7, 'critical_high': 20},
            'hematocrit': {'min': 36, 'max': 48, 'unit': '%', 'critical_low': 21, 'critical_high': 60},
            'cholesterol': {'min': 0, 'max': 200, 'unit': 'mg/dL', 'critical_low': 0, 'critical_high': 300},
            'hdl': {'min': 40, 'max': 100, 'unit': 'mg/dL', 'critical_low': 20, 'critical_high': 150},
            'ldl': {'min': 0, 'max': 130, 'unit': 'mg/dL', 'critical_low': 0, 'critical_high': 200},
            'triglycerides': {'min': 0, 'max': 150, 'unit': 'mg/dL', 'critical_low': 0, 'critical_high': 500},
            'creatinine': {'min': 0.7, 'max': 1.2, 'unit': 'mg/dL', 'critical_low': 0, 'critical_high': 5.0},
            'bun': {'min': 7, 'max': 20, 'unit': 'mg/dL', 'critical_low': 0, 'critical_high': 100},
            'wbc': {'min': 4.0, 'max': 11.0, 'unit': 'K/uL', 'critical_low': 1.0, 'critical_high': 50.0},
            'rbc': {'min': 4.2, 'max': 5.4, 'unit': 'M/uL', 'critical_low': 2.0, 'critical_high': 8.0},
            'platelets': {'min': 150, 'max': 450, 'unit': 'K/uL', 'critical_low': 20, 'critical_high': 1000},
            'sodium': {'min': 136, 'max': 145, 'unit': 'mEq/L', 'critical_low': 125, 'critical_high': 155},
            'potassium': {'min': 3.5, 'max': 5.0, 'unit': 'mEq/L', 'critical_low': 2.5, 'critical_high': 6.0},
            'chloride': {'min': 98, 'max': 107, 'unit': 'mEq/L', 'critical_low': 80, 'critical_high': 120},
            'tsh': {'min': 0.4, 'max': 4.0, 'unit': 'mIU/L', 'critical_low': 0, 'critical_high': 20},
            'alt': {'min': 7, 'max': 40, 'unit': 'U/L', 'critical_low': 0, 'critical_high': 200},
            'ast': {'min': 10, 'max': 40, 'unit': 'U/L', 'critical_low': 0, 'critical_high': 200}
        }
        
        return reference_ranges.get(test_name.lower(), {})
    
    def analyze_lab_values(self, lab_values: Dict[str, List[Tuple[str, str]]]) -> Dict[str, Any]:
        """Analyze lab values against reference ranges"""
        analysis = {
            "normal_values": [],
            "abnormal_values": [],
            "critical_values": [],
            "missing_ranges": []
        }
        
        for test_name, values in lab_values.items():
            ref_range = self.get_reference_ranges(test_name)
            
            if not ref_range:
                analysis["missing_ranges"].append(test_name)
                continue
            
            for value_str, unit in values:
                try:
                    value = float(value_str)
                    
                    if value <= ref_range.get('critical_low', 0) or value >= ref_range.get('critical_high', float('inf')):
                        analysis["critical_values"].append({
                            "test": test_name,
                            "value": value,
                            "unit": unit,
                            "reference_range": f"{ref_range['min']}-{ref_range['max']} {ref_range['unit']}",
                            "status": "CRITICAL"
                        })
                    elif value < ref_range['min'] or value > ref_range['max']:
                        status = "LOW" if value < ref_range['min'] else "HIGH"
                        analysis["abnormal_values"].append({
                            "test": test_name,
                            "value": value,
                            "unit": unit,
                            "reference_range": f"{ref_range['min']}-{ref_range['max']} {ref_range['unit']}",
                            "status": status
                        })
                    else:
                        analysis["normal_values"].append({
                            "test": test_name,
                            "value": value,
                            "unit": unit,
                            "reference_range": f"{ref_range['min']}-{ref_range['max']} {ref_range['unit']}",
                            "status": "NORMAL"
                        })
                        
                except ValueError:
                    logger.warning(f"Could not parse value '{value_str}' for {test_name}")
        
        return analysis

if __name__ == "__main__":
    logger.info("🔬 Testing Biomedical NER + MedCAT System...")
    extractor = MedicalEntityExtractor()
    
    sample_text = """
    Lab Results:
    Glucose: 145 mg/dL (Normal: 70-110)
    Hemoglobin: 12.5 g/dL (Normal: 12-16)
    Cholesterol: 220 mg/dL (Normal: <200)
    Creatinine: 1.2 mg/dL (Normal: 0.7-1.2)
    Potassium: 4.2 mEq/L (Normal: 3.5-5.0)
    Patient has diabetes and hypertension.
    """
    
    result = extractor.extract_entities(sample_text)
    
    print(f"\n✅ Extracted {len(result['medical_entities'])} medical entities")
    print(f"✅ Extracted {len(result['lab_values'])} lab value types")
    print(f"✅ Primary model: {result['processing_info']['primary_model']}")
    print(f"✅ Secondary model: {result['processing_info']['secondary_model']}")
    print(f"✅ Device used: {result['processing_info']['device_used']}")
    
    if result['medical_entities']:
        sources = {}
        for entity in result['medical_entities']:
            source = entity.get('source', 'unknown')
            if source not in sources:
                sources[source] = []
            sources[source].append(entity)
        
        for source, entities in sources.items():
            print(f"   {source}: {len(entities)} entities")
            for entity in entities[:3]:
                print(f"     - {entity['text']} ({entity['category']}) - {entity['confidence']:.2f}")
    
    if result['lab_values']:
        analysis = extractor.analyze_lab_values(result['lab_values'])
        print(f"\n📊 Lab Analysis: {len(analysis['normal_values'])} normal, {len(analysis['abnormal_values'])} abnormal, {len(analysis['critical_values'])} critical")
    
    print("\n🎯 Enhanced Biomedical NER system ready!")
