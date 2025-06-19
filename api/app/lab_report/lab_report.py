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
    """
    Complete Lab Report Analysis System
    
    Workflow: Image/PDF → OCR (Tesseract + OCR.space) → LLM Analysis
    Features: Comprehensive error handling, medical-grade accuracy
    """
    
    def __init__(self, litellm_api_key: str = None):
        """Initialize the complete lab report analysis system"""
        # Use environment variable if no API key is provided
        self.litellm_api_key = litellm_api_key or os.getenv("LITELLM_API_KEY")
        
        # Initialize components
        logger.info("Initializing Lab Report Analysis System...")
        
        # Initialize core components
        self.ocr_processor = OCRProcessor()
        self.prompt_manager = PromptManager()
        
        # Only initialize LLM components if API key is available
        if self.litellm_api_key and self.litellm_api_key != "your-litellm-api-key-here":
            self.llm_client = MedicalLLMClient(self.litellm_api_key)
        else:
            self.llm_client = None
            logger.warning("LiteLLM API key not provided - LLM analysis will be unavailable")
        
        logger.info(f"✅ Lab Report Analyzer initialized successfully!")
        
    def analyze_lab_report(self, file_path: str) -> Dict[str, Any]:
        """
        Complete end-to-end lab report analysis from image/PDF
        
        Args:
            file_path: Path to lab report image or PDF file
            
        Returns:
            Comprehensive analysis results dictionary
        """
        start_time = datetime.now()
        
        try:
            # Check if LLM client is available
            if not self.llm_client:
                return {
                    "success": False,
                    "error": "LiteLLM API key not configured. Please set LITELLM_API_KEY environment variable or provide API key during initialization.",
                    "file_path": file_path,
                    "processing_time": (datetime.now() - start_time).total_seconds()
                }
            
            # Validate file exists and format is supported
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            if not self.ocr_processor.is_supported_format(file_path):
                raise ValueError(f"Unsupported file format. Supported: {self.ocr_processor.get_supported_formats()}")
            
            logger.info(f"🔬 Starting analysis of: {file_path}")
            
            # Step 1: OCR Processing (Tesseract + OCR.space fallback)
            logger.info("📄 Step 1: OCR text extraction...")
            raw_text = self.ocr_processor.extract_text(file_path)
            
            if not raw_text.strip():
                return {
                    "success": False,
                    "error": "No text could be extracted from the file. Please ensure the image is clear and contains readable text.",
                    "file_path": file_path,
                    "processing_time": (datetime.now() - start_time).total_seconds()
                }
            
            logger.info(f"✅ OCR completed. Extracted {len(raw_text)} characters")
            
            print("\n" + "="*80)
            print("🔍 PIPELINE STEP 1: OCR OUTPUT → DIRECT LLM")
            print("="*80)
            print(raw_text[:500] + ("..." if len(raw_text) > 500 else ""))
            print("-" * 50)
            print(f"📄 Full Raw OCR Text:")
            print(repr(raw_text))  # Shows exact string with escape characters
            print("="*80 + "\n")
            
            lab_data = {
                "raw_text": raw_text,
                "medical_entities": [],  # Empty - LLM will extract from raw text
                "lab_values": {},        # Empty - LLM will extract from raw text
                "quantities": [],        # Empty - LLM will extract from raw text
                "lab_analysis": {}       # Empty - LLM will analyze directly
            }
            
            # Direct LLM analysis
            start_llm_time = datetime.now()
            ai_analysis_str = self.llm_client.analyze_lab_report(lab_data)
            llm_processing_time = (datetime.now() - start_llm_time).total_seconds()
            
            # Parse the JSON response from the LLM
            ai_analysis = self.prompt_manager.parse_compact_response(ai_analysis_str)

            # Create analysis result structure
            analysis_result = {
                "success": "error" not in ai_analysis,
                "raw_text": raw_text,
                "ai_analysis": ai_analysis,
                "processing_time": llm_processing_time,
                "system_info": {
                    "llm_status": self.llm_client.get_system_status()
                }
            }
            
            # print(f"🤖 Data Structure Sent Directly to LLM:")
            llm_input_structure = {
                "raw_text": f"'{raw_text[:100]}...'" if len(raw_text) > 100 else f"'{raw_text}'",
                "processing_time": f"{llm_processing_time:.2f}s"
            }
            # for key, value in llm_input_structure.items():
            #     print(f"   • {key}: {value}")
            
            # print("="*80 + "\n")
            
            # Add file processing information
            analysis_result.update({
                "file_path": file_path,
                "file_type": self._get_file_type(file_path),
                "ocr_method": self._get_ocr_method_used(),
                "total_processing_time": (datetime.now() - start_time).total_seconds()
            })
            
            if analysis_result["success"]:
                logger.info(f"✅ Analysis completed successfully in {analysis_result['total_processing_time']:.2f}s")
            else:
                logger.error(f"❌ Analysis failed: {analysis_result.get('error', 'Unknown error')}")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"❌ Complete analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path,
                "processing_time": (datetime.now() - start_time).total_seconds()
            }
    
    def analyze_text_only(self, text: str) -> Dict[str, Any]:
        """
        Analyze lab report from text input (bypass OCR)
        
        Args:
            text: Lab report text content
            
        Returns:
            Analysis results dictionary
        """
        if not self.llm_client:
            return {
                "success": False,
                "error": "LiteLLM API key not configured. Please set LITELLM_API_KEY environment variable or provide API key during initialization.",
                "processing_time": 0
            }
        
        logger.info("🔬 Starting text-only analysis...")
        
        # 🔍 PIPELINE TRACKING 1: Input Text to LLM
        print("\n" + "="*80)
        print("🔍 PIPELINE STEP 1: INPUT TEXT → DIRECT LLM")
        print("="*80)
        print(f"📄 Input Text Length: {len(text)} characters")
        print("📄 Input Text Preview (first 500 chars):")
        print("-" * 50)
        print(text[:500] + ("..." if len(text) > 500 else ""))
        print("-" * 50)
        print(f"📄 Full Input Text:")
        print(repr(text))  # Shows exact string with escape characters
        print("="*80 + "\n")
        
        start_time = datetime.now()
        
        try:
            # Prepare lab data for LLM analysis
            lab_data = {
                "raw_text": text,
                "medical_entities": [],  # Empty - LLM will extract from raw text
                "lab_values": {},        # Empty - LLM will extract from raw text
                "quantities": [],        # Empty - LLM will extract from raw text
                "lab_analysis": {}       # Empty - LLM will analyze directly
            }
            
            # Direct LLM analysis
            ai_analysis_str = self.llm_client.analyze_lab_report(lab_data)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Parse the JSON response
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
            
            print("\n" + "="*80)
            print("🔍 PIPELINE STEP 2: LLM ANALYSIS COMPLETED")
            print("="*80)
            print(f"⏱️  Processing time: {processing_time:.2f}s")
            print("="*80 + "\n")
            
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
        """
        Comprehensive analysis with additional patient context
        
        Args:
            file_path: Path to lab report file
            patient_medications: List of current medications
            previous_results: Previous lab results for trend analysis
            time_period: Time period between current and previous results
            
        Returns:
            Enhanced analysis with context
        """
        # Get basic analysis first
        result = self.analyze_lab_report(file_path)
        
        if not result["success"]:
            return result
        
        try:
            # Add medication interaction analysis
            if patient_medications:
                logger.info("💊 Analyzing medication interactions...")
                medication_analysis = self.llm_client.analyze_medication_interactions(result, patient_medications)
                result["medication_analysis"] = medication_analysis
            
            # Add trend analysis
            if previous_results:
                logger.info("📈 Performing trend analysis...")
                trend_analysis = self.llm_client.analyze_trends(
                    result, previous_results, time_period or "Not specified"
                )
                result["trend_analysis"] = trend_analysis
            
            logger.info("✅ Contextual analysis completed")
            
        except Exception as e:
            logger.error(f"⚠️  Contextual analysis failed: {e}")
            result["context_analysis_error"] = str(e)
        
        return result
    
    def batch_analyze(self, file_paths: list) -> Dict[str, Any]:
        """
        Analyze multiple lab reports in batch
        
        Args:
            file_paths: List of file paths to analyze
            
        Returns:
            Batch analysis results
        """
        logger.info(f"📚 Starting batch analysis of {len(file_paths)} files...")
        
        results = {
            "total_files": len(file_paths),
            "successful": 0,
            "failed": 0,
            "results": [],
            "errors": []
        }
        
        for i, file_path in enumerate(file_paths, 1):
            logger.info(f"📄 Processing file {i}/{len(file_paths)}: {file_path}")
            
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
                logger.error(f"❌ Failed to process {file_path}: {e}")
        
        logger.info(f"✅ Batch analysis completed: {results['successful']} successful, {results['failed']} failed")
        return results
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status and capabilities"""
        # Base system info
        system_info = {
            "llm_model": self.llm_client is not None
        }
        
        return {
            "system_info": system_info,
            "ocr_info": {
                "tesseract_available": True,  # OCRProcessor checks this during init
                "ocr_space_configured": bool(os.getenv("OCR_SPACE_API_KEY")),
                "supported_formats": self.ocr_processor.get_supported_formats()
            },
            "llm_info": {
                "model": self.llm_client.model if self.llm_client else None,
                "api_configured": bool(self.litellm_api_key and self.litellm_api_key != "your-litellm_api_key-here")
            }
        }

    def validate_setup(self) -> Dict[str, Any]:
        """Validate system setup and configuration"""
        validation = {
            "overall_status": "✅ Ready",
            "issues": [],
            "warnings": [],
            "recommendations": []
        }
        
        # Check OCR setup
        if not os.getenv("OCR_SPACE_API_KEY"):
            validation["warnings"].append("OCR.space API key not configured - only Tesseract will be used")
            validation["recommendations"].append("Set OCR_SPACE_API_KEY environment variable for better OCR fallback")
        
        # Check LLM setup
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
        """Get file type from extension"""
        return os.path.splitext(file_path)[1].lower()
    
    def _get_ocr_method_used(self) -> str:
        """Determine which OCR method was used (for reporting)"""
        if os.getenv("OCR_SPACE_API_KEY"):
            return "Tesseract + OCR.space fallback"
        else:
            return "Tesseract only"

# Convenience function for quick analysis
def analyze_lab_report(file_path: str, litellm_api_key: str = None) -> Dict[str, Any]:
    """
    Convenience function for quick lab report analysis
    
    Args:
        file_path: Path to lab report file
        litellm_api_key: LiteLLM API key (or set LITELLM_API_KEY env var)
        
    Returns:
        Analysis results
    """
    api_key = litellm_api_key or os.getenv("LITELLM_API_KEY")
    if not api_key:
        raise ValueError("LiteLLM API key required. Set LITELLM_API_KEY environment variable or pass as parameter.")
    
    analyzer = LabReportAnalyzer(api_key)
    return analyzer.analyze_lab_report(file_path)

# Main execution for testing
if __name__ == "__main__":
    # Get API key from environment
    api_key = os.getenv("LITELLM_API_KEY")
    
    if not api_key:
        print("⚠️  Please set your LITELLM_API_KEY environment variable")
        print("   export LITELLM_API_KEY='your-api-key-here'")
        sys.exit(1)
    
    # Initialize analyzer
    analyzer = LabReportAnalyzer(api_key)
    
    # Validate setup
    print("🔧 Validating system setup...")
    validation = analyzer.validate_setup()
    print(f"Status: {validation['overall_status']}")
    
    if validation['issues']:
        print("❌ Issues found:")
        for issue in validation['issues']:
            print(f"   - {issue}")
    
    if validation['warnings']:
        print("⚠️  Warnings:")
        for warning in validation['warnings']:
            print(f"   - {warning}")
    
    if validation['recommendations']:
        print("💡 Recommendations:")
        for rec in validation['recommendations']:
            print(f"   - {rec}")
    
    # Check for test files
    test_files = [
        "../../uploads/test_lab_report.jpg",
        "../../uploads/sample_lab.pdf",
        "test_lab_report.jpg"
    ]
    
    test_file = None
    for file_path in test_files:
        if os.path.exists(file_path):
            test_file = file_path
            break
    
    if test_file:
        print(f"\n🔬 Testing with file: {test_file}")
        result = analyzer.analyze_lab_report(test_file)
        
        if result["success"]:
            print("✅ Analysis completed successfully!")
            print(f"⏱️  Processing time: {result['total_processing_time']:.2f} seconds")
            print(f"📄 OCR method: {result['ocr_method']}")
            
            # Show brief analysis preview
            analysis = result.get("ai_analysis", "")
            print(f"\n📋 Analysis preview:")
            print(analysis[:200] + "..." if len(analysis) > 200 else analysis)
        else:
            print(f"❌ Analysis failed: {result['error']}")
    else:
        # Test with sample text instead
        print("\n🔬 Testing with sample lab text...")
        sample_text = """
        Laboratory Results Summary
        
        Complete Blood Count:
        - Hemoglobin: 13.8 g/dL (Normal: 12.0-16.0)
        - White Blood Cell Count: 7.2 K/uL (Normal: 4.0-11.0)
        - Platelets: 320 K/uL (Normal: 150-450)
        
        Chemistry Panel:
        - Glucose: 128 mg/dL (Normal: 70-110) SLIGHTLY HIGH
        - Creatinine: 0.9 mg/dL (Normal: 0.7-1.2)
        - Total Cholesterol: 195 mg/dL (Normal: <200)
        """
        
        result = analyzer.analyze_text_only(sample_text)
        
        if result["success"]:
            print("✅ Text analysis completed successfully!")
            print(f"⏱️  Processing time: {result['processing_time']:.2f} seconds")
            
            # Show extracted data
            entities = result.get('extracted_entities', {})
            print(f"🔍 Extracted: {len(entities.get('lab_values', {}))} lab values")
            
            # Show brief analysis
            analysis = result.get("ai_analysis", "")
            print(f"\n📋 Analysis preview:")
            print(analysis[:300] + "..." if len(analysis) > 300 else analysis)
        else:
            print(f"❌ Text analysis failed: {result['error']}")
    
    print("\n🎯 Lab Report Analysis System ready for use!")
    print("   - Supports images (JPG, PNG, TIFF) and PDFs")
    print("   - Uses Tesseract + OCR.space API for text extraction") 
    print("   - Provides comprehensive AI analysis via LangChain + OpenAI")
    print("   - Optimized for both GPU and CPU processing")

