"""
Lab Report Analysis System - Main Integration Module
Integrates OCR and LLM components for comprehensive lab report analysis
"""

import os
import sys
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

# Local module imports
from .ocr_processor import OCRProcessor
from .prompt_templates import PromptManager
from .llm_client import MedicalLLMClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LabReportAnalyzer:
    """Complete Lab Report Analysis System"""
    
    def __init__(self, litellm_api_key: str = None):
        self.litellm_api_key = litellm_api_key or os.getenv("LITELLM_API_KEY")
        
        logger.info("Initializing Lab Report Analysis System")
        
        self.ocr_processor = OCRProcessor()
        self.prompt_manager = PromptManager()
        
        if self.litellm_api_key and self.litellm_api_key != "your-litellm-api-key-here":
            self.llm_client = MedicalLLMClient(self.litellm_api_key)
        else:
            self.llm_client = None
            logger.warning("LiteLLM API key not provided - LLM analysis unavailable")
        
        logger.info("Lab Report Analyzer initialized successfully")
        
    def analyze_lab_report(self, file_path: str) -> Dict[str, Any]:
        start_time = datetime.now()
        
        try:
            if not self.llm_client:
                return {
                    "success": False,
                    "error": "LiteLLM API key not configured. Please set LITELLM_API_KEY environment variable or provide API key during initialization.",
                    "file_path": file_path,
                    "processing_time": (datetime.now() - start_time).total_seconds()
                }
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            if not self.ocr_processor.is_supported_format(file_path):
                raise ValueError(f"Unsupported file format. Supported: {self.ocr_processor.get_supported_formats()}")
            
            logger.info(f"Starting analysis: {file_path}")
            
            raw_text = self.ocr_processor.extract_text(file_path)
            
            if not raw_text.strip():
                return {
                    "success": False,
                    "error": "No text could be extracted from the file. Please ensure the image is clear and contains readable text.",
                    "file_path": file_path,
                    "processing_time": (datetime.now() - start_time).total_seconds()
                }
            
            logger.info(f"OCR completed: {len(raw_text)} characters extracted")
            
            lab_data = {
                "raw_text": raw_text,
                "medical_entities": [],
                "lab_values": {},
                "quantities": [],
                "lab_analysis": {}
            }
            
            start_llm_time = datetime.now()
            ai_analysis_str = self.llm_client.analyze_lab_report(lab_data)
            llm_processing_time = (datetime.now() - start_llm_time).total_seconds()
            
            ai_analysis = self.prompt_manager.parse_compact_response(ai_analysis_str)

            analysis_result = {
                "success": "error" not in ai_analysis,
                "raw_text": raw_text,
                "ai_analysis": ai_analysis,
                "processing_time": llm_processing_time,
                "system_info": {
                    "llm_status": self.llm_client.get_system_status()
                }
            }
            
            analysis_result.update({
                "file_path": file_path,
                "file_type": self._get_file_type(file_path),
                "ocr_method": self._get_ocr_method_used(),
                "total_processing_time": (datetime.now() - start_time).total_seconds()
            })
            
            if analysis_result["success"]:
                logger.info(f"Analysis completed successfully in {analysis_result['total_processing_time']:.2f}s")
            else:
                logger.error(f"Analysis failed: {analysis_result.get('error', 'Unknown error')}")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Complete analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path,
                "processing_time": (datetime.now() - start_time).total_seconds()
            }
    
    def analyze_text_only(self, text: str) -> Dict[str, Any]:
        if not self.llm_client:
            return {
                "success": False,
                "error": "LiteLLM API key not configured. Please set LITELLM_API_KEY environment variable or provide API key during initialization.",
                "processing_time": 0
            }
        
        logger.info("Starting text-only analysis")
        start_time = datetime.now()
        
        try:
            lab_data = {
                "raw_text": text,
                "medical_entities": [],
                "lab_values": {},
                "quantities": [],
                "lab_analysis": {}
            }
            
            ai_analysis_str = self.llm_client.analyze_lab_report(lab_data)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            ai_analysis = self.prompt_manager.parse_compact_response(ai_analysis_str)

            result = {
                "success": "error" not in ai_analysis,
                "raw_text": text,
                "ai_analysis": ai_analysis,
                "processing_time": processing_time,
                "system_info": {
                    "llm_status": self.llm_client.get_system_status()
                }
            }
            
            logger.info(f"Text analysis completed in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Text analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "raw_text": text,
                "processing_time": (datetime.now() - start_time).total_seconds()
            }

    def analyze_with_context(self, file_path: str, 
                           patient_medications: list = None,
                           previous_results: Dict[str, Any] = None,
                           time_period: str = None) -> Dict[str, Any]:
        result = self.analyze_lab_report(file_path)
        
        if not result["success"]:
            return result
        
        logger.info("Analysis completed (context features removed)")
        return result
    
    def batch_analyze(self, file_paths: list) -> Dict[str, Any]:
        logger.info(f"Starting batch analysis of {len(file_paths)} files")
        
        results = {
            "total_files": len(file_paths),
            "successful": 0,
            "failed": 0,
            "results": [],
            "errors": []
        }
        
        for i, file_path in enumerate(file_paths, 1):
            logger.info(f"Processing file {i}/{len(file_paths)}: {file_path}")
            
            try:
                result = self.analyze_lab_report(file_path)
                results["results"].append(result)
                
                if result["success"]:
                    results["successful"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append({
                        "file": file_path,
                        "error": result.get("error", "Unknown error")
                    })
                    
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "file": file_path,
                    "error": str(e)
                })
                logger.error(f"Failed to process {file_path}: {e}")
        
        logger.info(f"Batch analysis completed: {results['successful']} successful, {results['failed']} failed")
        return results
    
    def get_system_status(self) -> Dict[str, Any]:
        system_info = {
            "llm_model": self.llm_client is not None
        }
        
        return {
            "system_info": system_info,
            "ocr_info": {
                "tesseract_available": True,
                "ocr_space_configured": bool(os.getenv("OCR_SPACE_API_KEY")),
                "supported_formats": self.ocr_processor.get_supported_formats()
            },
            "llm_info": {
                "model": self.llm_client.model if self.llm_client else None,
                "api_configured": bool(self.litellm_api_key and self.litellm_api_key != "your-litellm_api_key-here")
            }
        }

    def validate_setup(self) -> Dict[str, Any]:
        validation = {
            "overall_status": "✅ Ready",
            "issues": [],
            "warnings": [],
            "recommendations": []
        }
        
        if not os.getenv("OCR_SPACE_API_KEY"):
            validation["warnings"].append("OCR.space API key not configured - only Tesseract will be used")
            validation["recommendations"].append("Set OCR_SPACE_API_KEY environment variable for better OCR fallback")
        
        if not self.litellm_api_key or self.litellm_api_key == "your-litellm-api-key-here":
            validation["issues"].append("LiteLLM API key not configured")
            validation["recommendations"].append("Set LITELLM_API_KEY environment variable")
            validation["overall_status"] = "❌ Configuration Issues"
        
        if validation["issues"]:
            validation["overall_status"] = "❌ Configuration Issues"
        elif validation["warnings"]:
            validation["overall_status"] = "⚠️  Ready with Warnings"
        
        return validation
    
    def _get_file_type(self, file_path: str) -> str:
        return os.path.splitext(file_path)[1].lower()
    
    def _get_ocr_method_used(self) -> str:
        if os.getenv("OCR_SPACE_API_KEY"):
            return "Tesseract + OCR.space fallback"
        else:
            return "Tesseract only"

def analyze_lab_report(file_path: str, litellm_api_key: str = None) -> Dict[str, Any]:
    api_key = litellm_api_key or os.getenv("LITELLM_API_KEY")
    if not api_key:
        raise ValueError("LiteLLM API key required. Set LITELLM_API_KEY environment variable or pass as parameter.")
    
    analyzer = LabReportAnalyzer(api_key)
    return analyzer.analyze_lab_report(file_path)

