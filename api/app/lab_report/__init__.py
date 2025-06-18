"""
Lab Report Analysis Package
Advanced medical lab report processing with GPU/CPU optimization

Components:
- ocr_processor: Tesseract + OCR.space API for text extraction
- medical_extractor: MedCat + spaCy for medical entity extraction  
- prompt_templates: Specialized medical prompts for LLM analysis
- llm_client: LangChain integration with OpenAI for AI analysis
- lab_report: Main integration module orchestrating all components
"""

from .lab_report import LabReportAnalyzer, analyze_lab_report
# from .medical_extractor import SystemCapabilities, MedicalEntityExtractor
from .ocr_processor import OCRProcessor
from .prompt_templates import PromptManager, MedicalPromptTemplates
from .llm_client import MedicalLLMClient

__version__ = "1.0.0"
__all__ = [
    "LabReportAnalyzer",
    "analyze_lab_report", 
    # "SystemCapabilities",
    # "MedicalEntityExtractor",
    "OCRProcessor",
    "PromptManager",
    "MedicalPromptTemplates",
    "MedicalLLMClient"
]