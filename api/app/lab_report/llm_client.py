"""
LLM Client Module
Main module responsible for LangChain integration, AI API calls, and response processing
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from .prompt_templates import PromptManager

logger = logging.getLogger(__name__)

class MedicalLLMClient:
    """LLM client optimized for medical analysis with OpenAI + DeepSeek fallback"""
    
    def __init__(self, openai_api_key: str = None, model: str = None):
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4")
        self.openai_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.prompt_manager = PromptManager()
        
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_model = "deepseek/deepseek-r1:free"
        self.deepseek_base_url = "https://openrouter.ai/api/v1"
        
        self.llm = self._initialize_openai_llm(self.model, self.openai_api_key)
        self.fallback_llm = self._initialize_deepseek_llm() if self.deepseek_api_key else None
        
        logger.info(f"Medical LLM Client initialized with primary model: {self.model}")
        if self.fallback_llm:
            logger.info(f"DeepSeek fallback model configured: {self.deepseek_model}")
        else:
            logger.warning("DeepSeek fallback not available - DEEPSEEK_API_KEY not set")
    
    def _initialize_openai_llm(self, model: str, api_key: str) -> ChatOpenAI:
        """Initialize OpenAI with medical-optimized settings"""
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=self.openai_base_url,
        )
    
    def _initialize_deepseek_llm(self) -> Optional[ChatOpenAI]:
        """Initialize DeepSeek LLM as fallback"""
        try:
            return ChatOpenAI(
                model=self.deepseek_model,
                api_key=self.deepseek_api_key,
                base_url=self.deepseek_base_url,
                temperature=0.1,
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
        try:
            logger.info(f"Attempting {operation} with OpenAI ({self.model})")
            
            try:
                prompt_template = chain_func.__closure__[0].cell_contents if hasattr(chain_func, '__closure__') else None
                if prompt_template is None:
                    chain = chain_func(self.llm)
                    response = chain.invoke(formatted_data)
                else:
                    messages = prompt_template.format_prompt(**formatted_data).to_messages()
                    llm_response = self.llm.invoke(messages)
                    
                    if hasattr(llm_response, 'content'):
                        response = llm_response.content
                    elif hasattr(llm_response, 'text') and callable(getattr(llm_response, 'text')):
                        response = llm_response.text()
                    elif isinstance(llm_response, str):
                        response = llm_response
                    else:
                        response = str(llm_response)
                    
                    if response is None or not response.strip():
                        raise ValueError("Empty response from direct OpenAI call")
                
            except Exception as direct_error:
                logger.warning(f"Direct invocation failed: {direct_error}, trying chain approach")
                chain = chain_func(self.llm)
                response = chain.invoke(formatted_data)
            
            if not response or not response.strip():
                raise ValueError("Empty response from OpenAI")
            
            logger.info(f"{operation} completed with OpenAI")
            return response
            
        except Exception as openai_error:
            logger.warning(f"OpenAI {operation} failed: {openai_error}")
            
            if self.fallback_llm:
                try:
                    logger.info(f"Attempting {operation} with DeepSeek fallback")
                    chain = chain_func(self.fallback_llm)
                    response = chain.invoke(formatted_data)
                    
                    if not response or not response.strip():
                        raise ValueError("Empty response from DeepSeek fallback")
                    
                    logger.info(f"{operation} completed with DeepSeek fallback")
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
        """Comprehensive lab report analysis with direct response handling"""
        try:
            validated_data = self.prompt_manager.validate_prompt_data(lab_data)
            formatted_data = self.prompt_manager.format_lab_data_for_prompt(validated_data)
            prompt_template = self.prompt_manager.get_lab_analysis_prompt(validated_data)
            
            logger.info("Starting comprehensive lab analysis")
            start_time = datetime.now()
            
            try:
                messages = prompt_template.format_prompt(**formatted_data).to_messages()
                llm_response = self.llm.invoke(messages)
                
                if hasattr(llm_response, 'content'):
                    response = llm_response.content
                elif hasattr(llm_response, 'text') and callable(getattr(llm_response, 'text')):
                    response = llm_response.text()
                elif isinstance(llm_response, str):
                    response = llm_response
                else:
                    response = str(llm_response)
                
                if not response or not response.strip():
                    raise ValueError("Empty response from direct OpenAI call")
                
                logger.info(f"Direct OpenAI call successful")
                
            except Exception as direct_error:
                logger.warning(f"Direct OpenAI call failed: {direct_error}")
                
                if self.fallback_llm:
                    logger.info("Attempting with DeepSeek fallback")
                    try:
                        chain = prompt_template | self.fallback_llm | StrOutputParser()
                        response = chain.invoke(formatted_data)
                        
                        if not response or not response.strip():
                            raise ValueError("Empty response from DeepSeek")
                        
                        logger.info("DeepSeek fallback successful")
                        response = f"[Analyzed with DeepSeek fallback]\n\n{response}"
                        
                    except Exception as deepseek_error:
                        logger.error(f"DeepSeek fallback also failed: {deepseek_error}")
                        return self._generate_error_fallback(formatted_data, "comprehensive lab analysis", 
                                                           f"Both OpenAI ({direct_error}) and DeepSeek ({deepseek_error}) failed")
                else:
                    logger.error("No fallback available")
                    return self._generate_error_fallback(formatted_data, "comprehensive lab analysis", 
                                                       f"OpenAI failed: {direct_error}. DeepSeek fallback not configured.")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Comprehensive lab analysis completed in {processing_time:.2f} seconds")
            
            return response
            
        except Exception as e:
            logger.error(f"Lab analysis failed completely: {e}", exc_info=True)
            return self._generate_fallback_analysis(lab_data, str(e))
    
    def _generate_error_fallback(self, formatted_data: Dict[str, Any], operation: str, error_msg: str) -> str:
        """Generate error fallback when both primary and fallback LLMs fail"""
        return f"""
# {operation.title()} - System Error

**Error**: {error_msg}

## System Status:
- Primary LLM (OpenAI): Failed
- Fallback LLM (DeepSeek): {"Failed" if self.fallback_llm else "Not configured"}

## Available Data:
{json.dumps(formatted_data, indent=2) if formatted_data else "No data available"}

## Recommendations:
1. Check your OPENAI_API_KEY and network connection
2. Verify OpenAI service status at {self.openai_base_url}
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
- Primary LLM (OpenAI): Failed
- Fallback LLM (DeepSeek): {"Failed" if self.fallback_llm else "Not configured"}

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
- Check OPENAI_API_KEY configuration
- Verify network connectivity
- Contact technical support if issues persist
"""
        
        return fallback_analysis
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status including fallback availability"""
        return {
            "primary_llm": {
                "model": self.model,
                "available": True,
                "provider": f"OpenAI ({self.model})",
                "base_url": self.openai_base_url
            },
            "fallback_llm": {
                "model": self.deepseek_model,
                "available": self.fallback_llm is not None,
                "provider": "DeepSeek (via OpenRouter)",
                "configured": bool(self.deepseek_api_key)
            },
            "fallback_strategy": "DeepSeek via OpenRouter with custom headers"
        }

if __name__ == "__main__":
    api_key = os.getenv("OPENAI_API_KEY", "your-openai-api-key-here")
    
    if api_key == "your-openai-api-key-here":
        exit(1)
    
    client = MedicalLLMClient(api_key)
