import os
import json
import logging
from typing import List, Dict, Any

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
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
                    max_retries=3
                )
                
                logger.info(f"✅ LiteLLM diagnosis client initialized successfully with model: {self.model}")
            except Exception as e:
                logger.error(f"Error configuring LiteLLM client: {e}")
                self.llm_client = None

    def diagnose(self, symptoms: List[str], background: Dict[str, Any] = None) -> Dict[str, Any]:
        """Main diagnosis method - simplified LLM API call"""
        if not self.llm_client:
            raise Exception("LLM diagnosis service is not available. Please check LITELLM_API_KEY configuration.")
        
        # Validate input
        if not symptoms or not isinstance(symptoms, list):
            raise ValueError("No valid symptoms provided")
        
        prompt_template = ChatPromptTemplate.from_messages([
        ("system", """You are Medicobud a AI assistant that specializing in symptom analysis and preliminary diagnosis. 
            Provide accurate, evidence-based medical assessments while emphasizing the importance of professional medical consultation.
            
            ### INPUT
            Your role is to:
            - Analyze patient symptoms and background context
            - Suggest the top 3 possible conditions (with confidence and reasoning)
            - Recommend safe home remedies if symptoms are mild
            - Assess if the case is urgent or needs professional care
            - Provide simple follow-up advice

            ### INPUT
            You will receive:
            - SYMPTOMS: {symptoms}
            - BACKGROUND INFO: {background_info}

            ### TASK
            Return only a JSON object that includes:
            ```json
            {{
            "possible_conditions": [
                {{
                "condition": "Condition Name",
                "confidence_percent": 85.5,
                "severity": "low | medium | high",
                "symptom_coverage_percent": 80,
                "key_symptoms": ["symptom1", "symptom2"],
                "explanation": "Short rationale for why this condition matches"
                }}
            ],
            "treatment_plan": [
                "Brief home remedy suggestions (e.g., hydration, rest, warm compresses, etc.) with web sources to read and search for it. Only include if symptoms are mild and there's no red flag."
            ],
            "risk_assessment": {{
                "urgency_level": "low | medium | high",
                "red_flags": ["symptom1", "symptom2"],
                "advice": "If any red flag is present, seek immediate medical attention."
            }},
            "follow_up": {{
                "monitor": ["what to track"],
                "timeline": "e.g., If symptoms persist beyond 3 days, consult a doctor.",
                "next_steps": "e.g., Take temperature twice daily, avoid physical exertion"
                }},
            }}
            ```

            ### IMPORTANT
            - Never invent or assume patient data not provided.
            - Use only general, non-invasive treatment suggestions (no prescriptions or unverified remedies).
            - Flag urgent or severe cases that may require immediate lab tests or professional care.
            """),
        ])
        
        # Prepare background information
        background_info = "No additional background information provided."
        if background:
            info_parts = []
            if background.get('age'):
                info_parts.append(f"Age: {background['age']}")
            if background.get('gender'):
                info_parts.append(f"Gender: {background['gender']}")
            if background.get('person_type'):
                info_parts.append(f"Patient type: {background['person_type']}")
            if background.get('onset') or background.get('timing_details'):
                onset = background.get('onset') or background.get('timing_details')
                info_parts.append(f"Symptom onset: {onset}")
            if background.get('severity'):
                info_parts.append(f"Pain severity (1-10): {background['severity']}")
            if background.get('temperature') or background.get('fever_level'):
                temp = background.get('temperature') or background.get('fever_level')
                info_parts.append(f"Temperature/Fever: {temp}")
            if background.get('substances') == 'yes' or background.get('substance_details'):
                info_parts.append("History of substance use (smoking/alcohol/drugs)")
            if background.get('travel_history') == 'yes' or background.get('travel_details'):
                info_parts.append("Recent travel history")
            if background.get('medical_care') == 'yes' or background.get('care_details'):
                info_parts.append("Recent medical care or medication use")
            
            if info_parts:
                background_info = '\n'.join(info_parts)
        
        formatted_data = {
            "symptoms": ', '.join(symptoms),
            "background_info": background_info
        }
        
        try:
            logger.info(f"Attempting diagnosis with LiteLLM ({self.model})")
            logger.info(f"Input data: symptoms={symptoms}, background keys={list(background.keys()) if background else 'None'}")
            
            json_parser = JsonOutputParser()
            chain = prompt_template | self.llm_client | json_parser
            response = chain.invoke(formatted_data)
            
            if not response or not isinstance(response, dict):
                raise ValueError("Invalid response format from LLM")
            
            logger.info(f"Diagnosis response keys: {list(response.keys())}")
            logger.info("Diagnosis completed successfully with LiteLLM")
            return response
            
        except Exception as e:
            logger.error(f"Error in LLM diagnosis: {e}")
            raise Exception(f"Diagnosis failed: {str(e)}")