"""
LLM Client Module
Main module responsible for LangChain integration, AI API calls, and response processing
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.language_models import BaseChatModel

# Local imports
from .prompt_templates import PromptManager
from .medical_extractor import MedicalEntityExtractor, SystemCapabilities

# Configure logging
logger = logging.getLogger(__name__)

class MedicalLLMClient:
    """LLM client optimized for medical analysis with LiteLLM + DeepSeek fallback"""
    
    def __init__(self, litellm_api_key: str, model: str = "openai/gpt-4.1-mini"):
        self.litellm_api_key = litellm_api_key
        self.model = model
        self.litellm_base_url = "https://litellm.xkcd.tech"
        self.prompt_manager = PromptManager()
        
        # DeepSeek configuration (fallback)
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_model = "deepseek/deepseek-r1:free"
        self.deepseek_base_url = "https://openrouter.ai/api/v1"
        
        # Initialize primary LLM (LiteLLM with Vertex AI Gemini)
        self.llm = self._initialize_litellm_llm(model, litellm_api_key)
        
        # Initialize fallback LLM (DeepSeek)
        self.fallback_llm = self._initialize_deepseek_llm() if self.deepseek_api_key else None
        
        logger.info(f"Medical LLM Client initialized with primary model: {model}")
        logger.info(f"LiteLLM base URL: {self.litellm_base_url}")
        if self.fallback_llm:
            logger.info(f"DeepSeek fallback model configured: {self.deepseek_model}")
        else:
            logger.warning("DeepSeek fallback not available - DEEPSEEK_API_KEY not set")
    
    def _initialize_litellm_llm(self, model: str, api_key: str) -> ChatOpenAI:
        """Initialize LiteLLM with Vertex AI Gemini model for medical-optimized settings"""
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=self.litellm_base_url,
            temperature=0.1,  # Low temperature for medical accuracy
            max_tokens=2500,  # Increased for comprehensive analysis
            request_timeout=120,  # Longer timeout for complex analysis
            max_retries=3,
            default_headers={
                "Content-Type": "application/json",
                "User-Agent": "medicobud-lab-analyzer/1.0"
            }
        )
    
    def _initialize_deepseek_llm(self) -> Optional[ChatOpenAI]:
        """Initialize DeepSeek LLM as fallback"""
        try:
            return ChatOpenAI(
                model=self.deepseek_model,
                api_key=self.deepseek_api_key,
                base_url=self.deepseek_base_url,
                temperature=0.1,  # Low temperature for medical accuracy
                max_tokens=2500,
                request_timeout=120,
                max_retries=2,
                default_headers={
                    "HTTP-Referer": "https://medicobud.com/",
                    "X-Title": "medicobud.com"
                }
            )
        except Exception as e:
            logger.error(f"Failed to initialize DeepSeek fallback: {e}")
            return None
    
    def _execute_with_fallback(self, chain_func, formatted_data: Dict[str, Any], operation: str) -> str:
        """Execute LLM operation with fallback to DeepSeek"""
        # Try primary LLM (LiteLLM with Vertex AI Gemini) first
        try:
            logger.info(f"Attempting {operation} with LiteLLM (openai/gpt-4.1-mini)...")
            chain = chain_func(self.llm)
            response = chain.invoke(formatted_data)
            logger.info(f"✅ {operation} completed with LiteLLM")
            return response
            
        except Exception as litellm_error:
            logger.warning(f"LiteLLM {operation} failed: {litellm_error}")
            
            # Try fallback LLM (DeepSeek)
            if self.fallback_llm:
                try:
                    logger.info(f"Attempting {operation} with DeepSeek fallback...")
                    chain = chain_func(self.fallback_llm)
                    response = chain.invoke(formatted_data)
                    logger.info(f"✅ {operation} completed with DeepSeek fallback")
                    return f"[Analyzed with DeepSeek fallback]\n\n{response}"
                    
                except Exception as deepseek_error:
                    logger.error(f"DeepSeek fallback {operation} failed: {deepseek_error}")
                    return self._generate_error_fallback(formatted_data, operation, 
                                                       f"Both LiteLLM ({litellm_error}) and DeepSeek ({deepseek_error}) failed")
            else:
                logger.error(f"No fallback available for {operation}")
                return self._generate_error_fallback(formatted_data, operation, 
                                                   f"LiteLLM failed: {litellm_error}. DeepSeek fallback not configured.")
    
    def analyze_lab_report(self, lab_data: Dict[str, Any]) -> str:
        """Comprehensive lab report analysis (now includes critical values) using specialized medical prompts with fallback"""
        try:
            # Validate and format lab data
            validated_data = self.prompt_manager.validate_prompt_data(lab_data)
            formatted_data = self.prompt_manager.format_lab_data_for_prompt(validated_data)
            
            # Get lab analysis prompt (this now implicitly handles critical values)
            prompt_template = self.prompt_manager.get_lab_analysis_prompt(validated_data)
            
            # 🔍 PIPELINE TRACKING 3: LLM CLIENT DATA & PROMPT
            print("\n" + "="*80)
            print("🔍 PIPELINE STEP 3: LLM CLIENT - DATA & PROMPT DETAILS")
            print("="*80)
            
            # print("📋 Raw Lab Data Received by LLM Client:")
            # print("-" * 50)
            # for key, value in lab_data.items():
            #     if key == "raw_text":
            #         print(f"   • {key}: '{value[:100]}...'" if len(str(value)) > 100 else f"   • {key}: '{value}'")
            #     elif key == "parsed_table":
            #         print(f"   • {key}: {len(value) if value else 0} rows")
            #         if value:
            #             print("     Sample rows:")
            #             for i, row in enumerate(value[:3]):
            #                 print(f"       {i+1}. {row}")
            #             if len(value) > 3:
            #                 print(f"       ... and {len(value) - 3} more rows")
            #     else:
            #         print(f"   • {key}: {value}")
            
            # print("\n📝 Validated & Formatted Data for Prompt:")
            # print("-" * 50)
            # for key, value in formatted_data.items():
            #     print(f"   • {key}: {value[:200]}..." if len(str(value)) > 200 else f"   • {key}: {value}")
            
            print("\n🤖 Full Prompt Template:")
            print("-" * 50)
            # Get the actual prompt text by formatting it with the data
            try:
                formatted_prompt = prompt_template.format_prompt(**formatted_data)
                prompt_text = formatted_prompt.to_string()
                print(prompt_text)
            except Exception as prompt_error:
                print(f"Error formatting prompt: {prompt_error}")
                print("Raw prompt template structure:", prompt_template)
            
            print("-" * 50)
            print("🚀 Sending to LLM...")
            print("="*80 + "\n")
            
            # Define chain function
            def create_chain(llm):
                return prompt_template | llm | StrOutputParser()
            
            logger.info("Starting comprehensive lab analysis (including critical values assessment)...")
            start_time = datetime.now()
            
            response = self._execute_with_fallback(create_chain, formatted_data, "comprehensive lab analysis")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Comprehensive lab analysis completed in {processing_time:.2f} seconds")
            
            # 🔍 PIPELINE TRACKING 4: LLM RESPONSE
            print("\n" + "="*80)
            print("🔍 PIPELINE STEP 4: LLM RESPONSE")
            print("="*80)
            print("🤖 Full LLM Response:")
            print(response)
            print("="*80 + "\n")
            
            return response
            
        except Exception as e:
            logger.error(f"Lab analysis failed completely: {e}", exc_info=True) # Added exc_info for detailed traceback
            return self._generate_fallback_analysis(lab_data, str(e))
    
    # Removed check_critical_values method as it's now integrated

    def analyze_trends(self, current_results: Dict[str, Any], 
                      previous_results: Dict[str, Any] = None,
                      time_period: str = "Not specified") -> str:
        """Analyze lab value trends over time with fallback"""
        try:
            formatted_data = {
                "current_results": json.dumps(current_results, indent=2),
                "previous_results": json.dumps(previous_results, indent=2) if previous_results else "No previous results available",
                "time_period": time_period
            }
            
            prompt_template = self.prompt_manager.get_trend_analysis_prompt(
                current_results, previous_results, time_period
            )
            
            # Define chain function
            def create_chain(llm):
                return prompt_template | llm | StrOutputParser()
            
            logger.info("Performing trend analysis...")
            response = self._execute_with_fallback(create_chain, formatted_data, "trend analysis")
            
            return response
            
        except Exception as e:
            logger.error(f"Trend analysis failed completely: {e}", exc_info=True)
            return f"Trend analysis failed: {str(e)}"
    
    def analyze_medication_interactions(self, lab_results: Dict[str, Any],
                                      medications: list = None) -> str:
        """Analyze potential medication effects on lab results with fallback"""
        try:
            formatted_data = {
                "lab_results": json.dumps(lab_results, indent=2),
                "medications": ", ".join(medications) if medications else "No medications provided"
            }
            
            prompt_template = self.prompt_manager.get_medication_interaction_prompt(
                lab_results, medications
            )
            
            # Define chain function
            def create_chain(llm):
                return prompt_template | llm | StrOutputParser()
            
            logger.info("Analyzing medication interactions...")
            response = self._execute_with_fallback(create_chain, formatted_data, "medication analysis")
            
            return response
            
        except Exception as e:
            logger.error(f"Medication interaction analysis failed completely: {e}", exc_info=True)
            return f"Medication interaction analysis failed: {str(e)}"
    
    def _generate_error_fallback(self, formatted_data: Dict[str, Any], operation: str, error_msg: str) -> str:
        """Generate error fallback when both primary and fallback LLMs fail"""
        return f"""
# {operation.title()} - System Error

**Error**: {error_msg}

## System Status:
- Primary LLM (LiteLLM): ❌ Failed
- Fallback LLM (DeepSeek): ❌ {"Failed" if self.fallback_llm else "Not configured"}

## Available Data:
{json.dumps(formatted_data, indent=2) if formatted_data else "No data available"}

## Recommendations:
1. Check your LITELLM_API_KEY and network connection
2. Verify LiteLLM service status at {self.litellm_base_url}
3. Try again in a few minutes
4. Contact support if the issue persists

**Note**: This is a system-generated response due to LLM service unavailability.
"""
    
    def _generate_fallback_analysis(self, lab_data: Dict[str, Any], error: str) -> str:
        """Generate fallback analysis when LLM fails"""
        fallback_analysis = f"""
# Lab Report Analysis - Fallback Mode

**Note**: AI analysis temporarily unavailable. Providing basic interpretation based on extracted data.

**Error**: {error}

## System Status:
- Primary LLM (LiteLLM): ❌ Failed
- Fallback LLM (DeepSeek): ❌ {"Failed" if self.fallback_llm else "Not configured"}

## Extracted Lab Values:
"""
        
        lab_values = lab_data.get("lab_values", {})
        if lab_values:
            for test_name, values in lab_values.items():
                fallback_analysis += f"\n- **{test_name.title()}**: "
                if isinstance(values, list) and values:
                    for value, unit in values:
                        fallback_analysis += f"{value} {unit}"
                else:
                    fallback_analysis += str(values)
        else:
            fallback_analysis += "\nNo lab values detected in the report."
        
        fallback_analysis += """

## Important Notice:
- This is a simplified analysis due to technical issues
- Please consult with a healthcare professional for proper interpretation
- Consider retrying the analysis or uploading a clearer image
- For any concerning values, seek immediate medical attention

## Recommendations:
1. Verify all values with your healthcare provider
2. Discuss any abnormal findings with your doctor
3. Follow up as recommended by your medical team
4. Try the analysis again later when services are restored

## Technical Support:
- Check LITELLM_API_KEY configuration
- Verify network connectivity
- Contact technical support if issues persist
"""
        
        return fallback_analysis
    
    # Removed _generate_fallback_critical_assessment as it's no longer needed
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status including fallback availability"""
        return {
            "primary_llm": {
                "model": self.model,
                "available": True,  # We can't test without making a call
                "provider": "LiteLLM (openai/gpt-4.1-mini)",
                "base_url": self.litellm_base_url
            },
            "fallback_llm": {
                "model": self.deepseek_model,
                "available": self.fallback_llm is not None,
                "provider": "DeepSeek (via OpenRouter)",
                "configured": bool(self.deepseek_api_key)
            },
            "fallback_strategy": "DeepSeek via OpenRouter with custom headers"
        }

# Update the LabReportAnalyzer class to handle the new LiteLLM system
class LabReportAnalyzer:
    """Main lab report analysis system integrating all components with LLM fallback"""
    
    def __init__(self, litellm_api_key: str):
        # Initialize system capabilities
        self.system_caps = SystemCapabilities()
        
        # Initialize components
        self.entity_extractor = MedicalEntityExtractor(self.system_caps)
        self.llm_client = MedicalLLMClient(litellm_api_key)
        
        logger.info(f"Lab Report Analyzer initialized with {self.system_caps.device.upper()} processing")
        
        # Log LLM system status
        llm_status = self.llm_client.get_system_status()
        logger.info(f"Primary LLM: {llm_status['primary_llm']['provider']} ({llm_status['primary_llm']['model']})")
        if llm_status['fallback_llm']['available']:
            logger.info(f"Fallback LLM: {llm_status['fallback_llm']['provider']} ({llm_status['fallback_llm']['model']})")
        else:
            logger.warning("Fallback LLM not available - set DEEPSEEK_API_KEY for better reliability")
    
    def analyze_extracted_data(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze already extracted lab data (for text-only analysis) with fallback support"""
        start_time = datetime.now()
        
        try:
            # Step 1: Medical Entity Extraction
            logger.info("Extracting medical entities...")
            entities = self.entity_extractor.extract_entities(extracted_data.get("raw_text", ""))
            
            # Step 2: Lab Values Analysis (still needed for counts and structured data for prompt)
            logger.info("Analyzing lab values...")
            lab_analysis = self.entity_extractor.analyze_lab_values(entities["lab_values"])
            
            # Step 3: Prepare comprehensive lab data
            lab_data = {
                "raw_text": extracted_data.get("raw_text", ""),
                "medical_entities": entities["medical_entities"],
                "lab_values": entities["lab_values"],
                "quantities": entities["quantities"],
                "spacy_entities": entities["spacy_entities"],
                "lab_analysis": lab_analysis, # This includes normal/abnormal/critical counts
                "processing_info": entities["processing_info"]
            }
            
            # Step 4: LLM Analysis (now a SINGLE call that includes critical values assessment)
            logger.info("Performing comprehensive LLM analysis (including critical values assessment)...")
            analysis = self.llm_client.analyze_lab_report(lab_data)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Include LLM system status in response
            llm_status = self.llm_client.get_system_status()
            
            return {
                "success": True,
                "raw_text": extracted_data.get("raw_text", ""),
                "extracted_entities": entities,
                "lab_analysis": lab_analysis, # Still useful for raw counts
                "ai_analysis": analysis, # This now contains the combined analysis including critical assessment
                "processing_time": processing_time,
                "system_info": {
                    "device_used": self.system_caps.device,
                    "gpu_available": self.system_caps.has_gpu,
                    "model_info": entities["processing_info"],
                    "llm_status": llm_status
                }
            }
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}", exc_info=True) # Added exc_info for detailed traceback
            return {
                "success": False,
                "error": str(e),
                "raw_text": extracted_data.get("raw_text", ""),
                "processing_time": (datetime.now() - start_time).total_seconds(),
                "system_info": {
                    "llm_status": self.llm_client.get_system_status()
                }
            }
    
    def analyze_text_only(self, text: str) -> Dict[str, Any]:
        """Analyze lab report from text input (skip OCR) with fallback support"""
        return self.analyze_extracted_data({"raw_text": text})
    
    def analyze_trends(self, current_data: Dict[str, Any], 
                      previous_data: Dict[str, Any] = None,
                      time_period: str = "Not specified") -> str:
        """Analyze trends between lab reports with fallback support"""
        return self.llm_client.analyze_trends(current_data, previous_data, time_period)
    
    def analyze_with_medications(self, lab_data: Dict[str, Any], 
                               medications: list = None) -> str:
        """Analyze lab results considering medication effects with fallback support"""
        return self.llm_client.analyze_medication_interactions(lab_data, medications)
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system capabilities and model information including LLM fallback status"""
        llm_status = self.llm_client.get_system_status()
        
        # Determine biomedical_ner status based on medcat availability
        biomedical_ner_available = self.entity_extractor.medcat is not None

        return {
            "gpu_available": self.system_caps.has_gpu,
            "device": self.system_caps.device,
            "gpu_memory_gb": self.system_caps.gpu_memory,
            "optimal_batch_size": self.system_caps.get_optimal_batch_size(),
            "models_loaded": {
                "spacy": self.entity_extractor.nlp is not None,
                "biomedical_ner": biomedical_ner_available, # Reflects MedCAT status
                "llm_model": self.llm_client is not None
            },
            "model_strategy": {
                "primary_ner": "MedCAT" if biomedical_ner_available else "Regex Fallback",
                "llm_provider": self.llm_client.model,
                "fallback_llm_provider": self.llm_client.deepseek_model if self.llm_client.fallback_llm else "None"
            },
            "llm_system": llm_status
        }
    
    def validate_setup(self) -> Dict[str, Any]:
        """Validate system setup including LLM fallback configuration"""
        validation = {
            "overall_status": "✅ Ready",
            "issues": [],
            "warnings": [],
            "recommendations": []
        }
        
        # Check LLM setup
        llm_status = self.llm_client.get_system_status()
        
        if not llm_status['fallback_llm']['configured']:
            validation["warnings"].append("DeepSeek fallback not configured - only LiteLLM will be used")
            validation["recommendations"].append("Set DEEPSEEK_API_KEY environment variable for better reliability")
        
        if not llm_status['fallback_llm']['available']:
            validation["warnings"].append("DeepSeek fallback not available")
        
        # Check OCR setup (assuming OCRProcessor handles its own logging for availability)
        # You can add more explicit checks here if needed, e.g., if self.ocr_processor.is_tesseract_available()
        
        # Check MedCat setup
        if not self.entity_extractor.medcat:
            validation["warnings"].append("MedCAT model not available - using regex fallback for medical entities.")
            validation["recommendations"].append("Ensure SNOMED CT zip is correct and MedCAT can build/load its model.")
        
        # Check spaCy setup
        if not self.entity_extractor.nlp:
            validation["issues"].append("spaCy model 'en_core_web_sm' not loaded.")
            validation["recommendations"].append("Install spaCy model: `python -m spacy download en_core_web_sm`.")
        
        # Check API key for LLM
        if not self.llm_client.litellm_api_key or self.llm_client.litellm_api_key == "your-litellm-api-key-here":
            validation["issues"].append("LiteLLM API key not configured.")
            validation["recommendations"].append("Set `LITELLM_API_KEY` environment variable.")
            validation["overall_status"] = "❌ Configuration Issues"
        
        # Check GPU setup
        if not self.system_caps.has_gpu:
            validation["warnings"].append("No GPU detected - using CPU processing (slower).")
            validation["recommendations"].append("Consider GPU setup for faster processing.")
        
        if validation["issues"]:
            validation["overall_status"] = "❌ Configuration Issues"
        elif validation["warnings"]:
            validation["overall_status"] = "⚠️  Ready with Warnings"
        
        return validation

# Usage example and testing (unchanged)
if __name__ == "__main__":
    # Example usage with fallback testing - now using LITELLM_API_KEY
    api_key = os.getenv("LITELLM_API_KEY", "your-litellm-api-key-here")
    
    if api_key == "your-litellm-api-key-here":
        print("⚠️  Please set your LITELLM_API_KEY environment variable")
        exit(1)
    
    analyzer = LabReportAnalyzer(api_key)
    
    # Test system status
    system_info = analyzer.get_system_info()
    llm_status = system_info['llm_system']
    
    print(f"🔧 System Status:")
    print(f"   Primary LLM: {llm_status['primary_llm']['provider']} ({'✅ Available' if llm_status['primary_llm']['available'] else '❌ Unavailable'})")
    print(f"   Fallback LLM: {llm_status['fallback_llm']['provider']} ({'✅ Available' if llm_status['fallback_llm']['available'] else '❌ Unavailable'})")
    
    # Test with sample text
    sample_text = """
    Complete Blood Count (CBC) Results:
    
    White Blood Cell Count: 8.5 K/uL (Normal: 4.0-11.0)
    Red Blood Cell Count: 4.8 M/uL (Normal: 4.2-5.4)
    Hemoglobin: 14.2 g/dL (Normal: 12.0-16.0)
    Hematocrit: 42.1% (Normal: 36-48)
    Platelets: 275 K/uL (Normal: 150-450)
    
    Chemistry Panel:
    Glucose: 165 mg/dL (Normal: 70-110) HIGH
    Creatinine: 1.1 mg/dL (Normal: 0.7-1.2)
    BUN: 18 mg/dL (Normal: 7-20)
    Sodium: 142 mEq/L (Normal: 136-145)
    Potassium: 4.1 mEq/L (Normal: 3.5-5.0)
    """
    
    print("\n🔬 Testing lab report analysis with LiteLLM + DeepSeek fallback support...")
    result = analyzer.analyze_text_only(sample_text)
    
    if result["success"]:
        print("✅ Analysis completed successfully!")
        print(f"⏱️  Processing time: {result['processing_time']:.2f} seconds")
        print(f"🤖 LLM Status: {result['system_info']['llm_status']}")
        
        analysis = result.get("ai_analysis", "")
        if "[Analyzed with DeepSeek fallback]" in analysis:
            print("🔄 Analysis completed using DeepSeek fallback")
        else:
            print("🎯 Analysis completed using primary LiteLLM model")
            
        # You can now parse the 'analysis' string to extract critical findings
        # based on the new template structure.
        print("\n--- Combined AI Analysis (Example Snippet) ---")
        print(analysis[:500] + "..." if len(analysis) > 500 else analysis)
            
    else:
        print(f"❌ Analysis failed: {result.get('error', 'Unknown error')}")
    
    print("\n🎯 LLM Client with LiteLLM + DeepSeek fallback ready for production!")

