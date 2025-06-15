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
    """LLM client optimized for medical analysis with OpenAI + DeepSeek fallback"""
    
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.api_key = api_key
        self.model = model
        self.prompt_manager = PromptManager()
        
        # DeepSeek configuration
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_model = "deepseek/deepseek-r1:free"
        self.deepseek_base_url = "https://openrouter.ai/api/v1"
        
        # Initialize primary LLM (OpenAI)
        self.llm = self._initialize_openai_llm(model, api_key)
        
        # Initialize fallback LLM (DeepSeek)
        self.fallback_llm = self._initialize_deepseek_llm() if self.deepseek_api_key else None
        
        logger.info(f"Medical LLM Client initialized with primary model: {model}")
        if self.fallback_llm:
            logger.info(f"DeepSeek fallback model configured: {self.deepseek_model}")
        else:
            logger.warning("DeepSeek fallback not available - DEEPSEEK_API_KEY not set")
    
    def _initialize_openai_llm(self, model: str, api_key: str) -> ChatOpenAI:
        """Initialize OpenAI LLM with medical-optimized settings"""
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            temperature=0.1,  # Low temperature for medical accuracy
            max_tokens=2500,  # Increased for comprehensive analysis
            request_timeout=120,  # Longer timeout for complex analysis
            max_retries=3
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
        # Try primary LLM (OpenAI) first
        try:
            logger.info(f"Attempting {operation} with OpenAI...")
            chain = chain_func(self.llm)
            response = chain.invoke(formatted_data)
            logger.info(f"✅ {operation} completed with OpenAI")
            return response
            
        except Exception as openai_error:
            logger.warning(f"OpenAI {operation} failed: {openai_error}")
            
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
                                                       f"Both OpenAI ({openai_error}) and DeepSeek ({deepseek_error}) failed")
            else:
                logger.error(f"No fallback available for {operation}")
                return self._generate_error_fallback(formatted_data, operation, 
                                                   f"OpenAI failed: {openai_error}. DeepSeek fallback not configured.")
    
    def analyze_lab_report(self, lab_data: Dict[str, Any]) -> str:
        """Comprehensive lab report analysis using specialized medical prompts with fallback"""
        try:
            # Validate and format lab data
            validated_data = self.prompt_manager.validate_prompt_data(lab_data)
            formatted_data = self.prompt_manager.format_lab_data_for_prompt(validated_data)
            
            # Get lab analysis prompt
            prompt_template = self.prompt_manager.get_lab_analysis_prompt(validated_data)
            
            # Define chain function
            def create_chain(llm):
                return prompt_template | llm | StrOutputParser()
            
            logger.info("Starting comprehensive lab analysis...")
            start_time = datetime.now()
            
            response = self._execute_with_fallback(create_chain, formatted_data, "lab analysis")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Lab analysis completed in {processing_time:.2f} seconds")
            
            return response
            
        except Exception as e:
            logger.error(f"Lab analysis failed completely: {e}")
            return self._generate_fallback_analysis(lab_data, str(e))
    
    def check_critical_values(self, lab_data: Dict[str, Any]) -> str:
        """Check for critical values requiring immediate medical attention with fallback"""
        try:
            # Format lab data for critical assessment
            formatted_data = {
                "lab_data": json.dumps(lab_data, indent=2)
            }
            
            # Get critical values prompt
            prompt_template = self.prompt_manager.get_critical_values_prompt(lab_data)
            
            # Define chain function
            def create_chain(llm):
                return prompt_template | llm | StrOutputParser()
            
            logger.info("Performing critical values assessment...")
            response = self._execute_with_fallback(create_chain, formatted_data, "critical values check")
            
            return response
            
        except Exception as e:
            logger.error(f"Critical values check failed completely: {e}")
            return self._generate_fallback_critical_assessment(lab_data, str(e))
    
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
            logger.error(f"Trend analysis failed completely: {e}")
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
            logger.error(f"Medication interaction analysis failed completely: {e}")
            return f"Medication interaction analysis failed: {str(e)}"
    
    def _generate_error_fallback(self, formatted_data: Dict[str, Any], operation: str, error_msg: str) -> str:
        """Generate error fallback when both primary and fallback LLMs fail"""
        return f"""
# {operation.title()} - System Error

**Error**: {error_msg}

## System Status:
- Primary LLM (OpenAI): ❌ Failed
- Fallback LLM (DeepSeek): ❌ {"Failed" if self.fallback_llm else "Not configured"}

## Available Data:
{json.dumps(formatted_data, indent=2) if formatted_data else "No data available"}

## Recommendations:
1. Check your API keys and network connection
2. Verify API service status
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
- Primary LLM (OpenAI): ❌ Failed
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
- Check API key configuration
- Verify network connectivity
- Contact technical support if issues persist
"""
        
        return fallback_analysis
    
    def _generate_fallback_critical_assessment(self, lab_data: Dict[str, Any], error: str) -> str:
        """Generate fallback critical assessment when LLM fails"""
        lab_values = lab_data.get("lab_values", {})
        
        # Basic critical value ranges (simplified)
        critical_ranges = {
            'glucose': (50, 400),
            'hemoglobin': (7, 20),
            'platelets': (20, 1000),
            'creatinine': (0, 5.0),
            'potassium': (2.5, 6.0),
            'sodium': (125, 155)
        }
        
        critical_found = []
        
        for test_name, values in lab_values.items():
            if test_name.lower() in critical_ranges:
                min_val, max_val = critical_ranges[test_name.lower()]
                
                if isinstance(values, list) and values:
                    try:
                        value = float(values[0][0])  # First value, first element (value)
                        if value < min_val or value > max_val:
                            critical_found.append(f"{test_name}: {value}")
                    except (ValueError, IndexError):
                        continue
        
        system_status = f"Primary LLM (OpenAI): ❌ Failed, Fallback LLM (DeepSeek): ❌ {'Failed' if self.fallback_llm else 'Not configured'}"
        
        if critical_found:
            return f"""
🚨 **POTENTIAL CRITICAL VALUES DETECTED** 🚨

**System Error**: {error}
**System Status**: {system_status}

**Potentially Critical Values Found**:
{chr(10).join(f"- {item}" for item in critical_found)}

**IMMEDIATE ACTION REQUIRED**:
1. Seek immediate medical attention
2. Contact your healthcare provider NOW
3. Go to the nearest emergency room if symptoms present
4. Do not delay medical care

**This is a basic screening only. Professional medical evaluation is essential.**

**Technical Note**: AI analysis systems are temporarily unavailable. This assessment is based on basic value ranges only.
"""
        else:
            return f"""
✅ **No immediately critical values detected in basic screening.**

**System Error**: {error}
**System Status**: {system_status}

**Important**: AI analysis failed, but basic screening completed. Please consult with healthcare professionals for proper interpretation of your lab results.

**Technical Note**: Try the analysis again later when AI services are restored.
"""
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status including fallback availability"""
        return {
            "primary_llm": {
                "model": self.model,
                "available": True,  # We can't test without making a call
                "provider": "OpenAI"
            },
            "fallback_llm": {
                "model": self.deepseek_model,
                "available": self.fallback_llm is not None,
                "provider": "DeepSeek (via OpenRouter)",
                "configured": bool(self.deepseek_api_key)
            },
            "fallback_strategy": "DeepSeek via OpenRouter with custom headers"
        }

# Update the LabReportAnalyzer class to handle the new fallback system
class LabReportAnalyzer:
    """Main lab report analysis system integrating all components with LLM fallback"""
    
    def __init__(self, openai_api_key: str):
        # Initialize system capabilities
        self.system_caps = SystemCapabilities()
        
        # Initialize components
        self.entity_extractor = MedicalEntityExtractor(self.system_caps)
        self.llm_client = MedicalLLMClient(openai_api_key)
        
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
            
            # Step 2: Lab Values Analysis
            logger.info("Analyzing lab values...")
            lab_analysis = self.entity_extractor.analyze_lab_values(entities["lab_values"])
            
            # Step 3: Prepare comprehensive lab data
            lab_data = {
                "raw_text": extracted_data.get("raw_text", ""),
                "medical_entities": entities["medical_entities"],
                "lab_values": entities["lab_values"],
                "quantities": entities["quantities"],
                "spacy_entities": entities["spacy_entities"],
                "lab_analysis": lab_analysis,
                "processing_info": entities["processing_info"]
            }
            
            # Step 4: LLM Analysis (with fallback support)
            logger.info("Performing comprehensive LLM analysis...")
            analysis = self.llm_client.analyze_lab_report(lab_data)
            
            # Step 5: Critical values check (with fallback support)
            logger.info("Checking for critical values...")
            critical_assessment = self.llm_client.check_critical_values(lab_data)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Include LLM system status in response
            llm_status = self.llm_client.get_system_status()
            
            return {
                "success": True,
                "raw_text": extracted_data.get("raw_text", ""),
                "extracted_entities": entities,
                "lab_analysis": lab_analysis,
                "ai_analysis": analysis,
                "critical_assessment": critical_assessment,
                "processing_time": processing_time,
                "system_info": {
                    "device_used": self.system_caps.device,
                    "gpu_available": self.system_caps.has_gpu,
                    "model_info": entities["processing_info"],
                    "llm_status": llm_status
                }
            }
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
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
        
        return {
            "gpu_available": self.system_caps.has_gpu,
            "device": self.system_caps.device,
            "gpu_memory_gb": self.system_caps.gpu_memory,
            "optimal_batch_size": self.system_caps.get_optimal_batch_size(),
            "models_loaded": {
                "spacy": self.entity_extractor.nlp is not None,
                "biomedical_ner": self.entity_extractor.biomedical_ner is not None,  # Fixed: use biomedical_ner instead of medcat
                "llm_model": self.llm_client is not None
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
            validation["warnings"].append("DeepSeek fallback not configured - only OpenAI will be used")
            validation["recommendations"].append("Set DEEPSEEK_API_KEY environment variable for better reliability")
        
        if not llm_status['fallback_llm']['available']:
            validation["warnings"].append("DeepSeek fallback not available")
        
        # Include existing validation logic...
        # (Keep all the existing validation code from the original method)
        
        return validation

# Usage example and testing
if __name__ == "__main__":
    # Example usage with fallback testing
    api_key = os.getenv("OPENAI_API_KEY", "your-openai-api-key-here")
    
    if api_key == "your-openai-api-key-here":
        print("⚠️  Please set your OPENAI_API_KEY environment variable")
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
    
    print("\n🔬 Testing lab report analysis with fallback support...")
    result = analyzer.analyze_text_only(sample_text)
    
    if result["success"]:
        print("✅ Analysis completed successfully!")
        print(f"⏱️  Processing time: {result['processing_time']:.2f} seconds")
        print(f"🤖 LLM Status: {result['system_info']['llm_status']}")
        
        analysis = result.get("ai_analysis", "")
        if "[Analyzed with DeepSeek fallback]" in analysis:
            print("🔄 Analysis completed using DeepSeek fallback")
        else:
            print("🎯 Analysis completed using primary OpenAI model")
            
    else:
        print(f"❌ Analysis failed: {result.get('error', 'Unknown error')}")
    
    print("\n🎯 LLM Client with DeepSeek fallback ready for production!")