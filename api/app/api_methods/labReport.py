# api_methods/lab_reports.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import date

from ..db import get_db
from ..models import DoctorVisit, LabReport
from ..schemas import LabReportCreate, LabReportResponse, LabReportUpdate
from ..routes.jwt import get_current_user

router = APIRouter(
    prefix="/visits/{visit_id}/lab-reports",
    tags=["lab-reports"],
)

app = FastAPI()

async def save_upload_file(upload_file: UploadFile) -> str:
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as f:
        content = await upload_file.read()
        f.write(content)
    
    return file_path

@router.post("/", response_model=LabReportResponse, status_code=status.HTTP_201_CREATED)
async def create_lab_report(
    visit_id: int,
    report_name: str = Form(...),
    report_type: str = Form(...),
    doctor_name: Optional[str] = Form(None),
    report_date: date = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    visit = db.query(DoctorVisit).filter(DoctorVisit.id == visit_id).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    file_path = await save_upload_file(file)
    
    db_report = LabReport(
        visit_id=visit_id,
        report_name=report_name,
        report_type=report_type,
        doctor_name=doctor_name,
        report_date=report_date,
        notes=notes,
        file_url=file_path
    )
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report

@router.get("/", response_model=List[LabReportResponse])
def get_lab_reports(
    visit_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    visit = db.query(DoctorVisit).filter(
        DoctorVisit.id == visit_id,
        DoctorVisit.user_id == current_user["sub"]
    ).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    reports = db.query(LabReport).filter(
        LabReport.visit_id == visit_id
    ).order_by(
        LabReport.report_date.desc()
    ).offset(skip).limit(limit).all()
    
    return reports

@router.get("/{report_id}", response_model=LabReportResponse)
def get_lab_report(
    visit_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    visit = db.query(DoctorVisit).filter(
        DoctorVisit.id == visit_id,
        DoctorVisit.user_id == current_user["sub"]
    ).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    report = db.query(LabReport).filter(
        LabReport.id == report_id,
        LabReport.visit_id == visit_id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab report not found"
        )
    
    return report

@router.put("/{report_id}", response_model=LabReportResponse)
def update_lab_report(
    visit_id: int,
    report_id: int,
    report_update: LabReportUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    visit = db.query(DoctorVisit).filter(
        DoctorVisit.id == visit_id,
        DoctorVisit.user_id == current_user["sub"]
    ).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    report = db.query(LabReport).filter(
        LabReport.id == report_id,
        LabReport.visit_id == visit_id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab report not found"
        )
    
    update_data = report_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(report, field, value)
    
    db.commit()
    db.refresh(report)
    
    return report

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_report(
    visit_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    visit = db.query(DoctorVisit).filter(
        DoctorVisit.id == visit_id,
        DoctorVisit.user_id == current_user["sub"]
    ).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    report = db.query(LabReport).filter(
        LabReport.id == report_id,
        LabReport.visit_id == visit_id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab report not found"
        )
    
    if os.path.exists(report.file_url):
        os.remove(report.file_url)
    
    db.delete(report)
    db.commit()
    
    return None