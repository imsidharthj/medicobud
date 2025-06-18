"""
Lab Report Analysis API Integration
Handles API endpoints and request/response management (Testing Version)
Simplified for testing - database operations commented out
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from pathlib import Path

# FastAPI imports
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, BackgroundTasks
# from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

# Local imports - Database related commented out for testing
# from ..db import get_db
# from ..models import DoctorVisit, LabReport
# from ..schemas import LabReportResponse, LabReportUpdate
# from ..routes.jwt import get_current_user
from .lab_report import LabReportAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Router - Simplified for testing
router = APIRouter(
    prefix="/lab-reports",  # Removed visit_id dependency for testing
    tags=["lab-reports-analysis"],
)

# Pydantic models for requests/responses
class LabAnalysisResponse(BaseModel):
    """Response model for lab analysis results"""
    success: bool
    analysis_id: Optional[str] = None
    raw_text: Optional[str] = None
    extracted_entities: Optional[Dict[str, Any]] = None
    lab_analysis: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[str] = None
    critical_assessment: Optional[str] = None
    medication_analysis: Optional[str] = None
    trend_analysis: Optional[str] = None
    processing_time: Optional[float] = None
    system_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class SystemStatusResponse(BaseModel):
    """Response model for system status"""
    status: str
    gpu_available: bool
    device: str
    ocr_configured: bool
    medcat_available: bool
    spacy_available: bool
    models_loaded: Dict[str, bool]
    recommendations: List[str] = []

# Commented out for testing - Database dependent model
# class LabReportWithAnalysis(BaseModel):
#     """Enhanced lab report model with analysis data"""
#     id: int
#     visit_id: int
#     report_name: str
#     report_type: str
#     doctor_name: Optional[str] = None
#     report_date: date
#     notes: Optional[str] = None
#     file_url: str
#     created_at: datetime
#     
#     # Analysis fields
#     has_analysis: bool = False
#     analysis_data: Optional[Dict[str, Any]] = None
#     last_analyzed: Optional[datetime] = None
#     analysis_summary: Optional[Dict[str, Any]] = None

# Global analyzer instance (will be initialized on first use)
_analyzer_instance: Optional[LabReportAnalyzer] = None

def get_analyzer(api_key: str = None) -> LabReportAnalyzer:
    """Get or create analyzer instance with improved error handling"""
    global _analyzer_instance
    
    # Use provided API key or get from environment
    litellm_api_key = api_key or os.getenv("LITELLM_API_KEY")
    
    if not litellm_api_key:
        # Check if DeepSeek is available as alternative
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key:
            logger.warning("LiteLLM API key not found, but DeepSeek fallback is available")
            # Use a placeholder for LiteLLM key since DeepSeek will be used as fallback
            litellm_api_key = "placeholder-for-deepseek-fallback"
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No AI API keys configured. Please set LITELLM_API_KEY or DEEPSEEK_API_KEY environment variable."
            )
    
    if _analyzer_instance is None:
        logger.info("Initializing Lab Report Analyzer with LiteLLM + DeepSeek fallback support...")
        _analyzer_instance = LabReportAnalyzer(litellm_api_key)
        
        # Get system status - using correct method name
        try:
            system_status = _analyzer_instance.get_system_status()
            logger.info(f"System initialized successfully")
            logger.info(f"OCR configured: {system_status.get('ocr_info', {}).get('ocr_space_configured', False)}")
            logger.info(f"GPU available: {system_status.get('system_info', {}).get('gpu_available', False)}")
        except Exception as e:
            logger.warning(f"Could not get detailed system status: {e}")
    
    return _analyzer_instance

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file and return file path"""
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{upload_file.filename}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as f:
            content = await upload_file.read()
            f.write(content)
        
        logger.info(f"File saved: {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

# Database operations commented out for testing
# def save_analysis_to_db(db: Session, report_id: int, analysis_data: Dict[str, Any]) -> None:
#     """Save analysis data to database"""
#     try:
#         report = db.query(LabReport).filter(LabReport.id == report_id).first()
#         if report:
#             # Create analysis summary for quick access
#             analysis_summary = {
#                 "analyzed_at": datetime.now().isoformat(),
#                 "processing_time": analysis_data.get("processing_time", 0),
#                 "has_critical_values": "🚨" in analysis_data.get("critical_assessment", ""),
#                 "lab_values_count": len(analysis_data.get("extracted_entities", {}).get("lab_values", {})),
#                 "device_used": analysis_data.get("system_info", {}).get("device_used", "unknown"),
#                 "success": analysis_data.get("success", False)
#             }
#             
#             # Store analysis data and summary
#             existing_notes = report.notes or ""
#             analysis_marker = "\n\n--- AI ANALYSIS ---\n"
#             summary_marker = "\n\n--- ANALYSIS SUMMARY ---\n"
#             
#             # Prepare analysis content
#             analysis_content = json.dumps(analysis_data, indent=2)
#             summary_content = json.dumps(analysis_summary, indent=2)
#             
#             if analysis_marker not in existing_notes:
#                 # First analysis
#                 report.notes = existing_notes + analysis_marker + analysis_content + summary_marker + summary_content
#             else:
#                 # Replace existing analysis
#                 parts = existing_notes.split(analysis_marker)
#                 report.notes = parts[0] + analysis_marker + analysis_content + summary_marker + summary_content
#             
#             db.commit()
#             logger.info(f"Analysis saved for report {report_id}")
#     except Exception as e:
#         logger.error(f"Error saving analysis to DB: {e}")

# def extract_analysis_from_notes(notes: str) -> Optional[Dict[str, Any]]:
#     """Extract analysis data from notes field"""
#     if not notes:
#         return None
#     
#     analysis_marker = "\n\n--- AI ANALYSIS ---\n"
#     summary_marker = "\n\n--- ANALYSIS SUMMARY ---\n"
#     
#     if analysis_marker not in notes:
#         return None
#     
#     try:
#         # Extract analysis data
#         analysis_part = notes.split(analysis_marker)[1]
#         if summary_marker in analysis_part:
#             analysis_part = analysis_part.split(summary_marker)[0]
#         
#         return json.loads(analysis_part)
#     except (IndexError, json.JSONDecodeError) as e:
#         logger.warning(f"Error extracting analysis from notes: {e}")
#         return None

# def extract_analysis_summary(notes: str) -> Optional[Dict[str, Any]]:
#     """Extract analysis summary from notes field"""
#     if not notes:
#         return None
#     
#     summary_marker = "\n\n--- ANALYSIS SUMMARY ---\n"
#     if summary_marker not in notes:
#         return None
#     
#     try:
#         summary_part = notes.split(summary_marker)[1]
#         return json.loads(summary_part)
#     except (IndexError, json.JSONDecodeError) as e:
#         logger.warning(f"Error extracting summary from notes: {e}")
#         return None

# SIMPLIFIED API ENDPOINTS FOR TESTING

@router.post("/analyze-file", response_model=LabAnalysisResponse)
async def analyze_lab_report_file(
    medications: Optional[str] = Form(None),  # JSON string of medications
    file: UploadFile = File(...)
):
    """Analyze lab report from uploaded file - Uses environment LITELLM_API_KEY"""
    
    # Validate file format
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    supported_formats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.pdf']
    if file_ext not in supported_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format {file_ext}. Supported: {supported_formats}"
        )
    
    # Save uploaded file
    file_path = await save_upload_file(file)
    
    try:
        # Initialize analyzer (uses environment LITELLM_API_KEY)
        analyzer = get_analyzer()
        
        # Parse medications if provided
        patient_medications = None
        if medications:
            try:
                patient_medications = json.loads(medications)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse medications: {medications}")
        
        # Perform analysis
        if patient_medications:
            result = analyzer.analyze_with_context(
                file_path, 
                patient_medications=patient_medications
            )
        else:
            result = analyzer.analyze_lab_report(file_path)
        
        if result["success"]:
            return LabAnalysisResponse(
                success=True,
                analysis_id=f"analysis_{int(datetime.now().timestamp())}",
                raw_text=result.get("raw_text"),
                extracted_entities=result.get("extracted_entities"),
                lab_analysis=result.get("lab_analysis"),
                ai_analysis=result.get("ai_analysis"),
                critical_assessment=result.get("critical_assessment"),
                medication_analysis=result.get("medication_analysis"),
                processing_time=result.get("total_processing_time", result.get("processing_time")),
                system_info=result.get("system_info")
            )
        else:
            return LabAnalysisResponse(
                success=False,
                error=result.get("error", "Analysis failed")
            )
            
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )
    finally:
        # Clean up uploaded file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to clean up file {file_path}: {e}")

# System status and health check endpoints

@router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status():
    """Get comprehensive system status for lab analysis including model strategy"""
    try:
        # Check if we have any API keys available
        litellm_key = os.getenv("LITELLM_API_KEY")
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        
        if not litellm_key and not deepseek_key:
            return SystemStatusResponse(
                status="❌ No API Keys",
                gpu_available=False,
                device="unknown",
                ocr_configured=False,
                medcat_available=False,
                spacy_available=False,
                models_loaded={},
                recommendations=["Set LITELLM_API_KEY or DEEPSEEK_API_KEY environment variable"]
            )
        
        # Initialize analyzer with available key
        test_key = litellm_key or "placeholder-for-deepseek-fallback"
        temp_analyzer = LabReportAnalyzer(test_key)
        system_status = temp_analyzer.get_system_status()
        
        # Extract system info from the simplified structure
        system_info = system_status.get('system_info', {})
        ocr_info = system_status.get('ocr_info', {})
        llm_info = system_status.get('llm_info', {})
        
        primary_available = bool(litellm_key)
        fallback_available = bool(deepseek_key)
        
        # Determine overall status
        if primary_available and fallback_available:
            status = "✅ Ready (LLM + Fallback)"
        elif primary_available or fallback_available:
            status = "⚠️ Ready (Limited LLM)"
        else:
            status = "❌ LLM Unavailable"
        
        recommendations = []
        if not primary_available:
            recommendations.append("Set LITELLM_API_KEY for primary LLM (gemini/gemini-2.5-flash-preview-05-20)")
        if not fallback_available:
            recommendations.append("Set DEEPSEEK_API_KEY for fallback reliability")
        if not ocr_info.get('ocr_space_configured', False):
            recommendations.append("Set OCR_SPACE_API_KEY for better OCR fallback")
        
        return SystemStatusResponse(
            status=status,
            gpu_available=False,  # Simplified - not using GPU features
            device="cpu",
            ocr_configured=ocr_info.get('ocr_space_configured', False),
            medcat_available=False,  # Not using medical_extractor
            spacy_available=False,   # Not using medical_extractor
            models_loaded={
                "primary_llm": primary_available,
                "fallback_llm": fallback_available,
                "ocr": True  # OCR processor is always available
            },
            recommendations=recommendations
        )
        
    except Exception as e:
        return SystemStatusResponse(
            status="❌ Error",
            gpu_available=False,
            device="unknown",
            ocr_configured=False,
            medcat_available=False,
            spacy_available=False,
            models_loaded={},
            recommendations=[f"System check failed: {str(e)}"]
        )

@router.get("/system/health")
async def check_analysis_system():
    """Detailed health check for the analysis system"""
    try:
        health_info = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "gpu_available": False,  # Simplified - not using GPU features
            "device": "cpu",
            "environment_variables": {
                "litellm_api_key_set": bool(os.getenv("LITELLM_API_KEY")),
                "deepseek_api_key_set": bool(os.getenv("DEEPSEEK_API_KEY")),
                "ocr_space_api_key_set": bool(os.getenv("OCR_SPACE_API_KEY"))
            },
            "dependencies": {
                "tesseract_available": True,  # OCRProcessor checks this
                "langchain_available": True
            }
        }
        
        return health_info
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# COMMENTED OUT DATABASE-DEPENDENT ENDPOINTS FOR TESTING

# @router.post("/", response_model=LabReportResponse, status_code=status.HTTP_201_CREATED)
# async def create_lab_report_with_analysis(
#     visit_id: int,
#     background_tasks: BackgroundTasks,
#     report_name: str = Form(...),
#     report_type: str = Form(...),
#     doctor_name: Optional[str] = Form(None),
#     report_date: date = Form(...),
#     notes: Optional[str] = Form(None),
#     openai_api_key: Optional[str] = Form(None),
#     auto_analyze: bool = Form(False),
#     medications: Optional[str] = Form(None),  # JSON string of medications
#     file: UploadFile = File(...),
#     db: Session = Depends(get_db)
# ):
#     """Create lab report and optionally perform AI analysis with new modular system"""
#     # Implementation commented out for testing

# async def perform_background_analysis(
#     file_path: str,
#     api_key: str,
#     report_id: int,
#     visit_id: int,
#     medications: List[str] = None
# ):
#     """Perform analysis in background task using new modular system"""
#     # Implementation commented out for testing

# @router.post("/{report_id}/analyze", response_model=LabAnalysisResponse)
# async def analyze_existing_lab_report(
#     visit_id: int,
#     report_id: int,
#     openai_api_key: str = Form(...),
#     medications: Optional[str] = Form(None),  # JSON string
#     include_trends: bool = Form(False),
#     db: Session = Depends(get_db)
# ):
#     """Analyze an existing lab report using the new modular system"""
#     # Implementation commented out for testing

# @router.get("/{report_id}/analysis", response_model=LabAnalysisResponse)
# async def get_lab_report_analysis(
#     visit_id: int,
#     report_id: int,
#     db: Session = Depends(get_db)
# ):
#     """Get existing analysis for a lab report"""
#     # Implementation commented out for testing

# @router.get("/", response_model=List[LabReportWithAnalysis])
# def get_lab_reports_with_analysis(
#     visit_id: int,
#     skip: int = 0,
#     limit: int = 50,
#     db: Session = Depends(get_db)
# ):
#     """Get all lab reports for a visit with analysis status"""
#     # Implementation commented out for testing