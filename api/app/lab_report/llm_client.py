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
from langchain_core.prompts import ChatPromptTemplate

# Local imports
from .prompt_templates import PromptManager

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
        
        # Initialize primary LLM (LiteLLM with Gemini)
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
        """Initialize LiteLLM with Gemini model for medical-optimized settings"""
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=self.litellm_base_url,
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
        # Try primary LLM (LiteLLM with Gemini) first
        try:
            logger.info(f"Attempting {operation} with LiteLLM ({self.model})...")
            
            # Try direct LLM invocation first to debug the response
            try:
                # Get the prompt template and format it
                prompt_template = chain_func.__closure__[0].cell_contents if hasattr(chain_func, '__closure__') else None
                if prompt_template is None:
                    # Fallback to creating chain normally
                    chain = chain_func(self.llm)
                    response = chain.invoke(formatted_data)
                else:
                    # Direct invocation for better debugging
                    messages = prompt_template.format_prompt(**formatted_data).to_messages()
                    logger.info(f"🔍 Sending {len(messages)} messages to LLM")
                    
                    # Direct LLM call
                    llm_response = self.llm.invoke(messages)
                    logger.info(f"🔍 Raw LLM Response Type: {type(llm_response)}")
                    
                    # Debug the response content in detail
                    logger.info(f"🔍 Response repr: {repr(llm_response)}")
                    logger.info(f"🔍 Response content attribute: {repr(getattr(llm_response, 'content', 'NO_CONTENT_ATTR'))}")
                    logger.info(f"🔍 Response additional_kwargs: {getattr(llm_response, 'additional_kwargs', 'NO_ADDITIONAL_KWARGS')}")
                    logger.info(f"🔍 Response response_metadata: {getattr(llm_response, 'response_metadata', 'NO_RESPONSE_METADATA')}")
                    
                    # Extract content properly based on response type
                    if hasattr(llm_response, 'content'):
                        response = llm_response.content
                        logger.info(f"🔍 Extracted content from .content attribute: '{response}' (length: {len(response) if response else 0})")
                    elif hasattr(llm_response, 'text') and callable(getattr(llm_response, 'text')):
                        response = llm_response.text()  # Call the method, don't access as property
                        logger.info(f"🔍 Extracted content from .text() method: '{response}' (length: {len(response) if response else 0})")
                    elif isinstance(llm_response, str):
                        response = llm_response
                        logger.info(f"🔍 Response is already a string: '{response}' (length: {len(response)})")
                    else:
                        logger.warning(f"🔍 Unknown response format, converting to string")
                        response = str(llm_response)
                    
                    # Check if response is actually empty or just whitespace
                    if response is None:
                        logger.error(f"🔍 Response is None!")
                        raise ValueError("Response is None from direct LiteLLM call")
                    elif not response.strip():
                        logger.error(f"🔍 Response is empty or whitespace only: '{response}' (length: {len(response)})")
                        raise ValueError("Empty response from direct LiteLLM call")
                    
                    logger.info(f"✅ Direct LiteLLM call successful, response length: {len(response)}")
                
            except Exception as direct_error:
                logger.warning(f"Direct invocation failed: {direct_error}, trying chain approach...")
                chain = chain_func(self.llm)
                response = chain.invoke(formatted_data)
            
            # Validate response is not empty
            if not response or not response.strip():
                logger.warning(f"LiteLLM returned empty response for {operation}")
                logger.warning(f"Response type: {type(response)}, Response repr: {repr(response)}")
                raise ValueError("Empty response from LiteLLM")
            
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
                    
                    # Validate fallback response is not empty
                    if not response or not response.strip():
                        logger.warning(f"DeepSeek also returned empty response for {operation}")
                        raise ValueError("Empty response from DeepSeek fallback")
                    
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
        """Comprehensive lab report analysis with direct response handling to fix LiteLLM parsing"""
        try:
            # Validate and format lab data
            validated_data = self.prompt_manager.validate_prompt_data(lab_data)
            formatted_data = self.prompt_manager.format_lab_data_for_prompt(validated_data)
            
            # Get lab analysis prompt
            prompt_template = self.prompt_manager.get_lab_analysis_prompt(validated_data)
            
            # 🔍 PIPELINE TRACKING 3: LLM CLIENT DATA & PROMPT
            print("\n" + "="*80)
            print("🔍 PIPELINE STEP 3: LLM CLIENT - DATA & PROMPT DETAILS")
            print("="*80)
            
            print("\n🤖 Formatted Prompt Data:")
            print("-" * 50)
            for key, value in formatted_data.items():
                print(f"   • {key}: {str(value)[:100]}..." if len(str(value)) > 100 else f"   • {key}: {value}")
            
            print("-" * 50)
            print("🚀 Sending to LLM...")
            print("="*80 + "\n")
            
            logger.info("Starting comprehensive lab analysis (including critical values assessment)...")
            start_time = datetime.now()
            
            # Try direct approach first (bypass StrOutputParser)
            try:
                # Format the prompt messages
                messages = prompt_template.format_prompt(**formatted_data).to_messages()
                logger.info(f"🔍 Sending {len(messages)} messages to LiteLLM")
                
                # Direct LLM call
                llm_response = self.llm.invoke(messages)
                logger.info(f"🔍 Raw LLM Response Type: {type(llm_response)}")
                
                # Extract content properly based on response type
                if hasattr(llm_response, 'content'):
                    response = llm_response.content
                    logger.info(f"🔍 Extracted content from .content attribute")
                elif hasattr(llm_response, 'text') and callable(getattr(llm_response, 'text')):
                    response = llm_response.text()  # Call the method, don't access as property
                    logger.info(f"🔍 Extracted content from .text() method")
                elif isinstance(llm_response, str):
                    response = llm_response
                    logger.info(f"🔍 Response is already a string")
                else:
                    logger.warning(f"🔍 Unknown response format, converting to string")
                    response = str(llm_response)
                
                # Validate response
                if not response or not response.strip():
                    raise ValueError("Empty response from direct LiteLLM call")
                
                logger.info(f"✅ Direct LiteLLM call successful, response length: {len(response)}")
                
            except Exception as direct_error:
                logger.warning(f"Direct LiteLLM call failed: {direct_error}")
                
                # Fallback to DeepSeek if available
                if self.fallback_llm:
                    logger.info("Attempting with DeepSeek fallback...")
                    try:
                        # Use chain approach for DeepSeek (it usually works fine)
                        chain = prompt_template | self.fallback_llm | StrOutputParser()
                        response = chain.invoke(formatted_data)
                        
                        if not response or not response.strip():
                            raise ValueError("Empty response from DeepSeek")
                        
                        logger.info(f"✅ DeepSeek fallback successful")
                        response = f"[Analyzed with DeepSeek fallback]\n\n{response}"
                        
                    except Exception as deepseek_error:
                        logger.error(f"DeepSeek fallback also failed: {deepseek_error}")
                        return self._generate_error_fallback(formatted_data, "comprehensive lab analysis", 
                                                           f"Both LiteLLM ({direct_error}) and DeepSeek ({deepseek_error}) failed")
                else:
                    logger.error("No fallback available")
                    return self._generate_error_fallback(formatted_data, "comprehensive lab analysis", 
                                                       f"LiteLLM failed: {direct_error}. DeepSeek fallback not configured.")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Comprehensive lab analysis completed in {processing_time:.2f} seconds")
            
            # 🔍 PIPELINE TRACKING 4: LLM RESPONSE
            print("\n" + "="*80)
            print("🔍 PIPELINE STEP 4: LLM RESPONSE")
            print("="*80)
            print(f"🤖 LLM Response Length: {len(response)} characters")
            print("🤖 LLM Response Preview (first 300 chars):")
            print("-" * 50)
            print(response[:300] + ("..." if len(response) > 300 else ""))
            print("-" * 50)
            print("🤖 Full LLM Response:")
            print(response)
            print("="*80 + "\n")
            
            return response
            
        except Exception as e:
            logger.error(f"Lab analysis failed completely: {e}", exc_info=True)
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
                "provider": f"LiteLLM ({self.model})",
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

# Remove the LabReportAnalyzer class that still references medical_extractor
# Usage example and testing
if __name__ == "__main__":
    # Example usage with fallback testing - now using LITELLM_API_KEY
    api_key = os.getenv("LITELLM_API_KEY", "your-litellm-api-key-here")
    
    if api_key == "your-litellm-api-key-here":
        print("⚠️  Please set your LITELLM_API_KEY environment variable")
        exit(1)
    
    # Test with sample text using MedicalLLMClient directly
    client = MedicalLLMClient(api_key)
    
    # Test system status
    llm_status = client.get_system_status()
    
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
    
    # Prepare lab data
    lab_data = {
        "raw_text": sample_text,
        "medical_entities": [],
        "lab_values": {},
        "quantities": [],
        "lab_analysis": {}
    }
    
    try:
        analysis = client.analyze_lab_report(lab_data)
        print("✅ Analysis completed successfully!")
        
        if "[Analyzed with DeepSeek fallback]" in analysis:
            print("🔄 Analysis completed using DeepSeek fallback")
        else:
            print("🎯 Analysis completed using primary LiteLLM model")
            
        print("\n--- AI Analysis (Example Snippet) ---")
        print(analysis[:500] + "..." if len(analysis) > 500 else analysis)
            
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
    
    print("\n🎯 LLM Client with LiteLLM + DeepSeek fallback ready for production!")

