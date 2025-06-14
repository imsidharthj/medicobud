"""
Medical Entity Extraction Module
Handles medical entity extraction using Biomedical NER with GPU/CPU optimization
"""

import os
import re
import logging
import torch
from typing import Dict, List, Any, Optional, Tuple
import spacy

# Transformers for biomedical NER
from transformers import (
    AutoTokenizer, 
    AutoModelForTokenClassification, 
    TokenClassificationPipeline,
    pipeline
)
import numpy as np

# Configure logging
logger = logging.getLogger(__name__)

class SystemCapabilities:
    """Detect and manage system capabilities (GPU/CPU)"""
    
    def __init__(self):
        self.has_gpu = torch.cuda.is_available()
        self.device = "cuda" if self.has_gpu else "cpu"
        self.gpu_memory = None
        
        if self.has_gpu:
            self.gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
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
        return 4  # Conservative CPU batch size

class MedicalEntityExtractor:
    """Medical entity extraction with Biomedical NER and GPU/CPU optimization"""
    
    def __init__(self, system_caps: Optional[SystemCapabilities] = None):
        self.system_caps = system_caps or SystemCapabilities()
        self.device = self.system_caps.device
        
        # Initialize models based on available resources
        self._init_models()
    
    def _init_models(self):
        """Initialize NLP models with optimal configuration"""
        try:
            # Load spaCy model for basic NER
            try:
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("Loaded spaCy en_core_web_sm model")
            except OSError:
                logger.warning("spaCy model not found. Install with: python -m spacy download en_core_web_sm")
                self.nlp = None
            
            # Initialize Biomedical NER model
            try:
                self.biomedical_ner = self._load_biomedical_ner()
                if self.biomedical_ner:
                    logger.info(f"Biomedical NER model loaded successfully on {self.device}")
                else:
                    logger.warning("Biomedical NER model not available. Using fallback regex extraction.")
                    
            except Exception as e:
                logger.warning(f"Failed to initialize Biomedical NER: {e}")
                self.biomedical_ner = None
                
        except Exception as e:
            logger.error(f"Error initializing models: {e}")
            self.biomedical_ner = None
    
    def _load_biomedical_ner(self) -> Optional[TokenClassificationPipeline]:
        """Load biomedical NER model using transformers"""
        try:
            # Choose model based on available resources
            if self.system_caps.has_gpu and self.system_caps.gpu_memory and self.system_caps.gpu_memory >= 4:
                # Use larger, more accurate model for GPU with sufficient memory
                model_name = "dmis-lab/biobert-v1.1-base-cased-ner"
                logger.info("Loading BioBERT NER model (GPU optimized)")
            else:
                # Use smaller, faster model for CPU or limited GPU memory
                model_name = "allenai/scibert_scivocab_uncased"
                logger.info("Loading SciBERT model (CPU/limited GPU optimized)")
            
            try:
                # Try to load the primary biomedical model
                tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = AutoModelForTokenClassification.from_pretrained(model_name)
                
                # Create pipeline with device specification
                ner_pipeline = pipeline(
                    "ner",
                    model=model,
                    tokenizer=tokenizer,
                    device=0 if self.device == "cuda" else -1,
                    aggregation_strategy="simple",
                    ignore_labels=[]
                )
                
                logger.info(f"Successfully loaded {model_name}")
                return ner_pipeline
                
            except Exception as model_error:
                logger.warning(f"Primary biomedical model failed: {model_error}")
                
                # Fallback to a more general biomedical model
                try:
                    fallback_model = "d4data/biomedical-ner-all"
                    logger.info(f"Trying fallback model: {fallback_model}")
                    
                    ner_pipeline = pipeline(
                        "ner",
                        model=fallback_model,
                        device=0 if self.device == "cuda" else -1,
                        aggregation_strategy="simple"
                    )
                    
                    logger.info(f"Successfully loaded fallback model: {fallback_model}")
                    return ner_pipeline
                    
                except Exception as fallback_error:
                    logger.warning(f"Fallback model also failed: {fallback_error}")
                    
                    # Final fallback to basic biomedical model
                    try:
                        basic_model = "emilyalsentzer/Bio_ClinicalBERT"
                        logger.info(f"Trying basic biomedical model: {basic_model}")
                        
                        # Note: This model might not have NER head, so we'll use it differently
                        ner_pipeline = pipeline(
                            "ner",
                            model="dbmdz/bert-large-cased-finetuned-conll03-english",
                            device=0 if self.device == "cuda" else -1,
                            aggregation_strategy="simple"
                        )
                        
                        logger.info("Using general NER model as final fallback")
                        return ner_pipeline
                        
                    except Exception as final_error:
                        logger.error(f"All biomedical models failed: {final_error}")
                        return None
            
        except Exception as e:
            logger.error(f"Error loading biomedical NER model: {e}")
            return None
    
    def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract medical entities from text using Biomedical NER and spaCy"""
        entities = {
            "medical_entities": [],
            "lab_values": {},
            "spacy_entities": [],
            "quantities": [],
            "processing_info": {
                "biomedical_ner_available": self.biomedical_ner is not None,
                "spacy_available": self.nlp is not None,
                "device_used": self.device
            }
        }
        
        try:
            # Biomedical NER extraction
            if self.biomedical_ner:
                try:
                    # Split text into chunks if too long (transformers have token limits)
                    max_length = 500  # Conservative limit for most models
                    text_chunks = self._split_text(text, max_length)
                    
                    for chunk in text_chunks:
                        if len(chunk.strip()) < 10:  # Skip very short chunks
                            continue
                            
                        ner_results = self.biomedical_ner(chunk)
                        
                        # Process NER results
                        for entity in ner_results:
                            entity_data = {
                                "text": entity["word"].replace("##", ""),  # Clean subword tokens
                                "label": [entity["entity_group"] if "entity_group" in entity else entity.get("label", "")],
                                "confidence": float(entity.get("score", 0.0)),
                                "start": int(entity.get("start", 0)),
                                "end": int(entity.get("end", 0)),
                                "cui": "",  # Not available in basic transformers
                                "description": self._get_entity_description(entity),
                                "category": self._categorize_biomedical_entity(entity)
                            }
                            entities["medical_entities"].append(entity_data)
                    
                    logger.info(f"Biomedical NER extracted {len(entities['medical_entities'])} entities")
                    
                except Exception as e:
                    logger.error(f"Biomedical NER processing failed: {e}")
                    # Fall back to regex extraction
                    entities["medical_entities"] = self._extract_medical_entities_regex(text)
            else:
                # Use regex-based extraction as fallback
                entities["medical_entities"] = self._extract_medical_entities_regex(text)
            
            # spaCy NER extraction for general entities
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
                    
                    # Extract quantities
                    entities["quantities"] = [
                        ent.text for ent in doc.ents 
                        if ent.label_ in ["QUANTITY", "CARDINAL", "PERCENT"]
                    ]
                    
                    logger.info(f"spaCy extracted {len(entities['spacy_entities'])} general entities")
                    
                except Exception as e:
                    logger.error(f"spaCy processing failed: {e}")
            
            # Regex-based lab value extraction (always run this as it's very reliable)
            entities["lab_values"] = self._extract_lab_values(text)
            
            # Post-process to remove duplicates and enhance entities
            entities = self._post_process_entities(entities)
            
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
        
        return entities
    
    def _split_text(self, text: str, max_length: int) -> List[str]:
        """Split text into chunks for transformer processing"""
        if len(text) <= max_length:
            return [text]
        
        # Split on sentences first, then on words if needed
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
    
    def _get_entity_description(self, entity: dict) -> str:
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
            "LAB_TEST": "Laboratory test or assay",
            "PERSON": "Person name",
            "ORG": "Organization",
            "GPE": "Geographical or political entity",
            "MISC": "Miscellaneous entity"
        }
        
        return descriptions.get(label.upper(), f"Biomedical entity: {label}")
    
    def _categorize_biomedical_entity(self, entity: dict) -> str:
        """Categorize biomedical entity based on its label"""
        label = entity.get("entity_group", entity.get("label", "")).upper()
        
        # Map biomedical labels to our categories
        category_mapping = {
            "CHEMICAL": "medication",
            "DRUG": "medication", 
            "DISEASE": "condition",
            "GENE": "anatomy",
            "PROTEIN": "lab_test",
            "ANATOMY": "anatomy",
            "PROCEDURE": "procedure",
            "LAB_TEST": "lab_test",
            "SPECIES": "other"
        }
        
        return category_mapping.get(label, "other")
    
    def _post_process_entities(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Post-process entities to remove duplicates and enhance quality"""
        # Remove duplicate medical entities
        seen_entities = set()
        unique_medical_entities = []
        
        for entity in entities["medical_entities"]:
            entity_key = (entity["text"].lower(), tuple(entity["label"]))
            if entity_key not in seen_entities:
                seen_entities.add(entity_key)
                unique_medical_entities.append(entity)
        
        entities["medical_entities"] = unique_medical_entities
        
        # Enhance lab values with entity information
        enhanced_lab_values = {}
        for test_name, values in entities["lab_values"].items():
            enhanced_lab_values[test_name] = values
            
            # Check if this lab test was also found by NER
            for entity in entities["medical_entities"]:
                if test_name.lower() in entity["text"].lower() or entity["text"].lower() in test_name.lower():
                    entity["category"] = "lab_test"  # Ensure proper categorization
        
        entities["lab_values"] = enhanced_lab_values
        
        return entities
    
    def _categorize_medical_entity(self, types: List[str]) -> str:
        """Categorize medical entity based on its types (legacy method for compatibility)"""
        if not types:
            return "Unknown"
        
        # Common medical entity categories
        categories = {
            "lab_test": ["laboratory test", "lab test", "test", "assay", "protein"],
            "medication": ["medication", "drug", "pharmaceutical", "medicine", "chemical"],
            "condition": ["disease", "disorder", "condition", "syndrome"],
            "anatomy": ["anatomy", "body part", "organ", "tissue", "gene"],
            "procedure": ["procedure", "treatment", "therapy", "surgery"],
            "measurement": ["measurement", "value", "quantity", "unit"]
        }
        
        types_lower = [t.lower() for t in types]
        
        for category, keywords in categories.items():
            if any(keyword in ' '.join(types_lower) for keyword in keywords):
                return category
        
        return "Other"
    
    def _extract_medical_entities_regex(self, text: str) -> List[Dict[str, Any]]:
        """Extract medical entities using regex patterns (fallback method)"""
        entities = []
        
        # Enhanced medical terms patterns
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
                    "confidence": 0.8,  # Default confidence for regex matches
                    "start": match.start(),
                    "end": match.end(),
                    "cui": "",
                    "description": f"Regex-matched {category}",
                    "category": self._map_regex_category(category)
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
            # Filter out empty matches
            valid_matches = [(value, unit) for value, unit in matches if value.strip()]
            if valid_matches:
                extracted_values[test_name] = valid_matches
                logger.debug(f"Found {len(valid_matches)} valid matches for {test_name}")
        
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
                    
                    # Check if critical
                    if value <= ref_range.get('critical_low', 0) or value >= ref_range.get('critical_high', float('inf')):
                        analysis["critical_values"].append({
                            "test": test_name,
                            "value": value,
                            "unit": unit,
                            "reference_range": f"{ref_range['min']}-{ref_range['max']} {ref_range['unit']}",
                            "status": "CRITICAL"
                        })
                    # Check if abnormal
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

# Usage example
if __name__ == "__main__":
    extractor = MedicalEntityExtractor()
    
    # Test with sample lab report text
    sample_text = """
    Lab Results:
    Glucose: 145 mg/dL (Normal: 70-110)
    Hemoglobin: 12.5 g/dL (Normal: 12-16)
    Cholesterol: 220 mg/dL (Normal: <200)
    Creatinine: 1.2 mg/dL (Normal: 0.7-1.2)
    Potassium: 4.2 mEq/L (Normal: 3.5-5.0)
    Patient has diabetes and hypertension.
    """
    
    print("🔬 Testing Biomedical Entity Extraction...")
    result = extractor.extract_entities(sample_text)
    
    print(f"✅ Extracted {len(result['medical_entities'])} medical entities")
    print(f"✅ Extracted {len(result['lab_values'])} lab values")
    print(f"✅ Device used: {result['processing_info']['device_used']}")
    print(f"✅ Biomedical NER available: {result['processing_info']['biomedical_ner_available']}")
    
    # Show some extracted entities
    if result['medical_entities']:
        print(f"\n📋 Sample medical entities:")
        for entity in result['medical_entities'][:5]:
            print(f"   - {entity['text']} ({entity['category']}) - {entity['confidence']:.2f}")
    
    # Analyze lab values
    if result['lab_values']:
        analysis = extractor.analyze_lab_values(result['lab_values'])
        print(f"📊 Analysis: {len(analysis['normal_values'])} normal, {len(analysis['abnormal_values'])} abnormal, {len(analysis['critical_values'])} critical")
    
    print("\n🎯 Biomedical NER system ready!")