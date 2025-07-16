import os
import json
import logging
from typing import List, Dict, Any
from fuzzywuzzy import fuzz
from app.utils import unique_symptoms, load_default_disease_data

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

class DiagnosisService:
    def __init__(self, dataset_path: str = None, weights_path: str = None):
        # Initialize LiteLLM client with LangChain
        self.litellm_api_key = os.getenv("LITELLM_API_KEY")
        self.litellm_base_url = os.getenv("LITELLM_BASE_URL", "https://litellm.xkcd.tech")
        self.model = os.getenv("LITELLM_MODEL", "openai/gpt-4.1-mini")
        
        if not self.litellm_api_key:
            self.llm_client = None
            logger.warning("LITELLM_API_KEY not found. LLM diagnosis will not be available.")
        else:
            try:
                # Initialize LiteLLM client
                self.llm_client = ChatOpenAI(
                    model=self.model,
                    api_key=self.litellm_api_key,
                    base_url=self.litellm_base_url,
                    temperature=0.2,
                    max_tokens=2000,
                    request_timeout=120,
                    max_retries=2
                )
                
                logger.info(f"✅ LiteLLM diagnosis client initialized successfully with model: {self.model}")
            except Exception as e:
                logger.error(f"Error configuring LiteLLM client: {e}")
                self.llm_client = None

        # Load symptom data for validation
        if not unique_symptoms:
            load_default_disease_data()

    def normalize_symptom(self, symptom: str) -> str:
        """Normalize symptom text for consistency"""
        if not isinstance(symptom, str):
            return ""
        normalized = symptom.strip().lower()
        normalized = normalized.replace("dischromic _patches", "dischromic_patches")
        normalized = normalized.replace("spotting_ urination", "spotting_urination")
        normalized = normalized.replace("foul_smell_of urine", "foul_smell_of_urine")
        normalized = normalized.replace(" ", "_")
        return normalized

    def fuzzy_match_symptoms(self, input_symptoms: List[str], threshold: int = 85) -> List[str]:
        """Match input symptoms against known symptoms using fuzzy matching"""
        matched_symptoms = []
        all_known_symptoms = set(unique_symptoms)
        
        for input_symptom in input_symptoms:
            normalized_input = self.normalize_symptom(input_symptom)
            
            if normalized_input in all_known_symptoms:
                matched_symptoms.append(normalized_input)
                continue
            
            best_match = None
            best_score = 0
            
            for known_symptom in all_known_symptoms:
                score = fuzz.ratio(normalized_input, known_symptom)
                if score > best_score and score >= threshold:
                    best_score = score
                    best_match = known_symptom
            
            if best_match:
                matched_symptoms.append(best_match)
            else:
                matched_symptoms.append(normalized_input)
        
        return matched_symptoms

    def _create_diagnosis_prompt(self, symptoms: List[str], background: Dict[str, Any] = None) -> ChatPromptTemplate:
        """Create a structured prompt template for diagnosis"""
        
        # Prepare background information for context
        background_context = ""
        if background:
            context_parts = []
            if background.get('age'):
                context_parts.append(f"Age: {background['age']}")
            if background.get('gender'):
                context_parts.append(f"Gender: {background['gender']}")
            if background.get('onset'):
                context_parts.append(f"Symptom onset: {background['onset']}")
            if background.get('severity'):
                context_parts.append(f"Pain severity (1-10): {background['severity']}")
            if background.get('temperature'):
                context_parts.append(f"Fever level: {background['temperature']}")
            if background.get('smoking') == 'yes':
                context_parts.append("History of smoking")
            if background.get('alcohol') == 'yes':
                context_parts.append("Regular alcohol consumption")
            if background.get('travel_history') == 'yes':
                context_parts.append("Recent travel history")
            
            if context_parts:
                background_context = f"\n\nPatient background: {', '.join(context_parts)}"

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are a medical AI assistant specializing in symptom analysis and preliminary diagnosis. 
            Provide accurate, evidence-based medical assessments while emphasizing the importance of professional medical consultation.
            
            Always return your response as a valid JSON array with the exact format specified below."""),
            
            ("human", """Analyze these symptoms: {symptoms}.{background_context}

Provide a comprehensive medical assessment with the 5 most likely conditions based on these symptoms. 
Consider common conditions first, then less common ones based on symptom patterns. 
For each condition, assess the severity level and symptom coverage.

Return ONLY a JSON array with this exact format:
[
  {{
    "disease": "Condition Name",
    "confidence": 0.85,
    "severity": "medium",
    "symptom_coverage": 75,
    "key_symptoms": ["symptom1", "symptom2"],
    "explanations": ["Brief explanation of why this condition fits"]
  }}
]

Important guidelines:
- Use decimal confidence values between 0.0 and 1.0
- Severity must be: 'low', 'medium', or 'high'
- Symptom_coverage should be a percentage (0-100)
- Order by likelihood (highest confidence first)
- Use standard medical condition names
- Key_symptoms should list the most relevant symptoms for this condition
- Explanations should be brief and medically sound
- Return only the JSON array, no other text""")
        ])
        
        return prompt_template

    def _llm_diagnose(self, symptoms: List[str], background: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Primary diagnosis method using LiteLLM with LangChain"""
        if not self.llm_client or not symptoms:
            return []

        try:
            # Create prompt template
            prompt_template = self._create_diagnosis_prompt(symptoms, background)
            
            # Prepare background context
            background_context = ""
            if background:
                context_parts = []
                if background.get('age'):
                    context_parts.append(f"Age: {background['age']}")
                if background.get('gender'):
                    context_parts.append(f"Gender: {background['gender']}")
                if background.get('onset'):
                    context_parts.append(f"Symptom onset: {background['onset']}")
                if background.get('severity'):
                    context_parts.append(f"Pain severity (1-10): {background['severity']}")
                if background.get('temperature'):
                    context_parts.append(f"Fever level: {background['temperature']}")
                if background.get('smoking') == 'yes':
                    context_parts.append("History of smoking")
                if background.get('alcohol') == 'yes':
                    context_parts.append("Regular alcohol consumption")
                if background.get('travel_history') == 'yes':
                    context_parts.append("Recent travel history")
                
                if context_parts:
                    background_context = f"\n\nPatient background: {', '.join(context_parts)}"
            
            # Format input data
            formatted_data = {
                "symptoms": ', '.join(symptoms),
                "background_context": background_context
            }
            
            logger.info(f"Attempting diagnosis with LiteLLM ({self.model})")
            
            # Create and execute chain
            chain = prompt_template | self.llm_client | StrOutputParser()
            response = chain.invoke(formatted_data)
            
            if not response or not response.strip():
                raise ValueError("Empty response from LiteLLM")
            
            logger.info("Diagnosis completed with LiteLLM")
            return self._parse_diagnosis_response(response, symptoms)
                
        except Exception as e:
            logger.error(f"Error in LLM diagnosis: {e}")
            return self._extract_diseases_from_text(f"LiteLLM failed: {e}", symptoms)

    def _parse_diagnosis_response(self, response: str, symptoms: List[str]) -> List[Dict[str, Any]]:
        """Parse and validate the LLM diagnosis response"""
        try:
            # Clean up the response
            text_content = response.strip()
            
            if text_content.startswith("```json"):
                text_content = text_content[7:]
            if text_content.startswith("```"):
                text_content = text_content[3:]
            if text_content.endswith("```"):
                text_content = text_content[:-3]
            
            text_content = text_content.strip()
            
            # Parse JSON response
            data = json.loads(text_content)
            if isinstance(data, list):
                formatted_results = []
                for item in data[:5]:  # Limit to top 5
                    if isinstance(item, dict) and "disease" in item:
                        disease = item["disease"]
                        confidence = item.get("confidence", 0.5)
                        severity = item.get("severity", "medium")
                        symptom_coverage = item.get("symptom_coverage", 50)
                        key_symptoms = item.get("key_symptoms", [])
                        explanations = item.get("explanations", [])
                        
                        # Validate and normalize confidence
                        if isinstance(confidence, (int, float)):
                            if confidence > 1.0:
                                confidence = confidence / 100.0
                            confidence = max(0.0, min(1.0, confidence))
                        else:
                            confidence = 0.5
                        
                        # Validate severity
                        if severity not in ['low', 'medium', 'high']:
                            severity = 'medium'
                        
                        # Validate symptom coverage
                        if not isinstance(symptom_coverage, (int, float)) or symptom_coverage < 0 or symptom_coverage > 100:
                            symptom_coverage = 50
                        
                        formatted_results.append({
                            "disease": disease,
                            "confidence": round(confidence * 100, 1),  # Convert to percentage
                            "severity": severity,
                            "symptom_coverage": int(symptom_coverage),
                            "key_symptoms": key_symptoms if isinstance(key_symptoms, list) else [],
                            "explanations": explanations if isinstance(explanations, list) else []
                        })
                
                return formatted_results
            else:
                return []
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return self._extract_diseases_from_text(response, symptoms)

    def _extract_diseases_from_text(self, text: str, symptoms: List[str]) -> List[Dict[str, Any]]:
        """Fallback method to extract diseases from unstructured text"""
        common_diseases = [
            "Common Cold", "Influenza", "COVID-19", "Pneumonia", "Bronchitis",
            "Asthma", "Allergies", "Sinusitis", "Migraine", "Tension Headache",
            "Gastroenteritis", "Food Poisoning", "Dehydration", "Anxiety",
            "Depression", "Hypertension", "Diabetes", "Arthritis"
        ]
        
        found_diseases = []
        text_lower = text.lower()
        
        for disease in common_diseases:
            if disease.lower() in text_lower:
                confidence = 60.0  # Base confidence
                
                # Boost confidence for symptom matches
                if any(symptom in ["fever", "cough", "fatigue"] for symptom in symptoms):
                    if disease in ["Common Cold", "Influenza", "COVID-19"]:
                        confidence = 80.0
                
                found_diseases.append({
                    "disease": disease,
                    "confidence": confidence,
                    "severity": "medium",
                    "symptom_coverage": 60,
                    "key_symptoms": symptoms[:3],  # Use first 3 symptoms
                    "explanations": [f"Pattern matches common presentation of {disease}"]
                })
                
                if len(found_diseases) >= 5:
                    break
        
        # If no diseases found, provide generic fallback
        if not found_diseases:
            found_diseases = [
                {
                    "disease": "Viral Infection",
                    "confidence": 60.0,
                    "severity": "low",
                    "symptom_coverage": 50,
                    "key_symptoms": symptoms[:2],
                    "explanations": ["Symptoms consistent with common viral infection"]
                },
                {
                    "disease": "Bacterial Infection",
                    "confidence": 40.0,
                    "severity": "medium",
                    "symptom_coverage": 40,
                    "key_symptoms": symptoms[:2],
                    "explanations": ["Could indicate bacterial infection requiring evaluation"]
                }
            ]
        
        return found_diseases[:5]

    def format_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format diagnosis results with disclaimer"""
        disclaimer = (
            "DISCLAIMER: This is an AI-generated diagnosis based on reported symptoms and should not be "
            "considered a substitute for professional medical advice. The information provided is for "
            "educational purposes only. Please consult a qualified healthcare provider for diagnosis, "
            "treatment recommendations, and answers to your personal medical questions."
        )
        return {"diagnosis": results, "disclaimer": disclaimer}

    def diagnose(self, symptoms: List[str], background: Dict[str, Any] = None) -> Dict[str, Any]:
        """Main diagnosis method - now purely LLM-based with LangChain"""
        if not self.llm_client:
            return {
                "error": "LLM diagnosis service is not available. Please check LITELLM_API_KEY configuration.",
                "diagnosis": [],
                "disclaimer": "Medical AI service unavailable. Please consult a healthcare provider."
            }
        
        # Clean and validate symptoms
        clean_symptoms = [s.strip().lower() for s in (symptoms if isinstance(symptoms, list) else [symptoms]) 
                         if isinstance(s, str) and s.strip()]
        
        if not clean_symptoms:
            return {
                "error": "No valid symptoms provided",
                "diagnosis": [],
                "disclaimer": "Cannot provide diagnosis without symptoms."
            }
        
        # Normalize symptoms using fuzzy matching
        matched_symptoms = self.fuzzy_match_symptoms(clean_symptoms)
        
        # Get background data
        bg = background or {}
        
        # Primary LLM diagnosis
        diagnosis_results = self._llm_diagnose(matched_symptoms, bg)
        
        # Format and return results
        response_payload = self.format_results(diagnosis_results)
        
        # Add matched symptoms for reference
        response_payload["analyzed_symptoms"] = matched_symptoms
        response_payload["original_symptoms"] = clean_symptoms
        
        return response_payload

    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status including LLM availability"""
        return {
            "primary_llm": {
                "model": self.model,
                "available": self.llm_client is not None,
                "provider": f"LiteLLM ({self.model})",
                "base_url": self.litellm_base_url
            },
            "symptom_validation": {
                "available": bool(unique_symptoms),
                "symptom_count": len(unique_symptoms) if unique_symptoms else 0
            }
        }