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
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..db import get_db
from ..models import LabRecords
from .lab_report import LabReportAnalyzer
from ..temp.temp_user import temp_user_manager, FeatureType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/lab-reports",
    tags=["lab-reports-analysis"],
)


class LabAnalysisResponse(BaseModel):
    """Response model for lab analysis results"""
    success: bool
    analysis_id: Optional[str] = None
    raw_text: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    processing_time: Optional[float] = None
    system_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    temp_user_id: Optional[str] = None
    remaining_daily: Optional[int] = None

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

_analyzer_instance: Optional[LabReportAnalyzer] = None


def get_analyzer(api_key: str = None) -> LabReportAnalyzer:
    """Get or create analyzer instance with improved error handling"""
    global _analyzer_instance
    
    openai_api_key = api_key or os.getenv("OPENAI_API_KEY")
    
    if not openai_api_key:
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key:
            logger.warning("OpenAI API key not found, but DeepSeek fallback is available")
            openai_api_key = "placeholder-for-deepseek-fallback"
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No AI API keys configured. Please set OPENAI_API_KEY or DEEPSEEK_API_KEY environment variable."
            )
    
    if _analyzer_instance is None:
        logger.info("Initializing Lab Report Analyzer with OpenAI + DeepSeek fallback support...")
        _analyzer_instance = LabReportAnalyzer(openai_api_key)
        
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


def save_lab_records(db: Session, user_id: str, email: str, ai_analysis: Dict[str, Any]):
    """
    Extracts relevant lab values from the AI analysis and saves them to the database.
    Only 'test' and 'value' fields are stored.
    """
    if not ai_analysis or "values" not in ai_analysis:
        logger.warning("AI analysis did not contain 'values' field. Nothing to save.")
        return

    lab_values_full = ai_analysis.get("values", [])
    if not isinstance(lab_values_full, list):
        logger.warning("'values' field in AI analysis is not a list. Nothing to save.")
        return
        
    extracted_values = [
        {"test": record.get("test"), "value": record.get("value")}
        for record in lab_values_full
        if "test" in record and "value" in record
    ]

    if not extracted_values:
        logger.info("No valid test-value pairs found in the AI analysis. Nothing to save.")
        return

    db_record = LabRecords(
        user_id=user_id,
        email=email,
        values=extracted_values
    )
    db.add(db_record)
    db.commit()
    logger.info(f"Lab report values saved for user {user_id}.")


@router.post("/analyze-file", response_model=LabAnalysisResponse)
async def analyze_lab_report_file(
    request: Request,
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    temp_user_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Analyze lab report from uploaded file with temp user support and rate limiting."""
    
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
    
    # Handle temporary user with Redis-based system
    is_temp_user = not email or not user_id
    final_temp_user_id = None
    remaining_daily = None
    
    if is_temp_user:
        # Get or create temp user
        if temp_user_id and temp_user_manager.is_temp_user(temp_user_id):
            final_temp_user_id = temp_user_id
        else:
            final_temp_user_id = temp_user_manager.create_temp_user_from_request(request)
        
        # Check feature access and rate limits
        try:
            access_info = temp_user_manager.check_feature_access(final_temp_user_id, FeatureType.LAB_REPORT)
            remaining_daily = access_info.get("remaining_daily", 0)
            
            # Create a feature session for tracking
            session_id = temp_user_manager.create_feature_session(
                final_temp_user_id,
                FeatureType.LAB_REPORT,
                {"file_name": file.filename, "file_type": file_ext}
            )
            
            logger.info(f"Lab report analysis started for temp user {final_temp_user_id}, session: {session_id}")
            
        except HTTPException as rate_limit_error:
            # Return rate limit error with user info
            return LabAnalysisResponse(
                success=False,
                error=rate_limit_error.detail,
                temp_user_id=final_temp_user_id,
                remaining_daily=0
            )
        except Exception as e:
            logger.error(f"Error checking temp user access: {e}")
            return LabAnalysisResponse(
                success=False,
                error="Unable to verify user access",
                temp_user_id=final_temp_user_id
            )
    
    file_path = await save_upload_file(file)
    
    try:
        analyzer = get_analyzer()
        result = analyzer.analyze_lab_report(file_path)
        analysis_id = f"analysis_{int(datetime.now().timestamp())}"
        
        if result["success"]:
            # Save to database for authenticated users only
            if user_id and email and result.get("ai_analysis"):
                try:
                    save_lab_records(db, user_id, email, result["ai_analysis"])
                except Exception as e:
                    logger.error(f"Failed to save lab records for user {user_id}: {e}")
            
            # For temp users, update session with results
            elif is_temp_user and final_temp_user_id:
                try:
                    temp_user_manager.update_temp_session(session_id, {
                        "analysis_results": result.get("ai_analysis"),
                        "processing_time": result.get("total_processing_time"),
                        "status": "completed"
                    })
                except Exception as e:
                    logger.warning(f"Failed to update temp session: {e}")

            return LabAnalysisResponse(
                success=True,
                analysis_id=analysis_id,
                raw_text=result.get("raw_text"),
                ai_analysis=result.get("ai_analysis"),
                processing_time=result.get("total_processing_time", result.get("processing_time")),
                system_info=result.get("system_info"),
                temp_user_id=final_temp_user_id,
                remaining_daily=remaining_daily
            )
        else:
            return LabAnalysisResponse(
                success=False,
                error=result.get("error", "Analysis failed"),
                temp_user_id=final_temp_user_id,
                remaining_daily=remaining_daily
            )
            
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )
    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to clean up file {file_path}: {e}")


@router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status():
    """Get comprehensive system status for lab analysis including model strategy"""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        
        if not openai_key and not deepseek_key:
            return SystemStatusResponse(
                status="❌ No API Keys",
                gpu_available=False,
                device="unknown",
                ocr_configured=False,
                medcat_available=False,
                spacy_available=False,
                models_loaded={},
                recommendations=["Set OPENAI_API_KEY or DEEPSEEK_API_KEY environment variable"]
            )
        
        test_key = openai_key or "placeholder-for-deepseek-fallback"
        temp_analyzer = LabReportAnalyzer(test_key)
        system_status = temp_analyzer.get_system_status()
        
        system_info = system_status.get('system_info', {})
        ocr_info = system_status.get('ocr_info', {})
        llm_info = system_status.get('llm_info', {})
        
        primary_available = bool(openai_key)
        fallback_available = bool(deepseek_key)
        
        if primary_available and fallback_available:
            status = "✅ Ready (LLM + Fallback)"
        elif primary_available or fallback_available:
            status = "⚠️ Ready (Limited LLM)"
        else:
            status = "❌ LLM Unavailable"
        
        recommendations = []
        if not primary_available:
            recommendations.append("Set OPENAI_API_KEY for primary LLM (gemini/gemini-2.5-flash-preview-05-20)")
        if not fallback_available:
            recommendations.append("Set DEEPSEEK_API_KEY for fallback reliability")
        if not ocr_info.get('ocr_space_configured', False):
            recommendations.append("Set OCR_SPACE_API_KEY for better OCR fallback")
        
        return SystemStatusResponse(
            status=status,
            gpu_available=False,
            device="cpu",
            ocr_configured=ocr_info.get('ocr_space_configured', False),
            medcat_available=False,
            spacy_available=False,
            models_loaded={
                "primary_llm": primary_available,
                "fallback_llm": fallback_available,
                "ocr": True
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
            "gpu_available": False,
            "device": "cpu",
            "environment_variables": {
                "openai_api_key_set": bool(os.getenv("OPENAI_API_KEY")),
                "deepseek_api_key_set": bool(os.getenv("DEEPSEEK_API_KEY")),
                "ocr_space_api_key_set": bool(os.getenv("OCR_SPACE_API_KEY"))
            },
            "dependencies": {
                "tesseract_available": True,
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
