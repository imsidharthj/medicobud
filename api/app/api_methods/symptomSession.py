from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, FastAPI, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import datetime
import os
import shutil
from uuid import uuid4

from ..db import get_db
from ..models import DoctorVisit, SymptomSession
from ..schemas import SymptomSessionCreate, SymptomSessionResponse
from ..services import diagnose_symptoms
from ..utils import load_disease_data, get_file_url

router = APIRouter(
    prefix="/visits/{visit_id}/symptoms",
    tags=["symptoms"],
)

app = FastAPI()

async def save_upload_file(upload_file: UploadFile) -> str:
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        content = await upload_file.read()
        buffer.write(content)
    
    return file_path

diseases_dict = load_disease_data("dataset.csv")

@router.post("/", response_model=SymptomSessionResponse, status_code=status.HTTP_201_CREATED)
async def diagnose_patient(
    visit_id: int,
    symptoms: List[str] = Form(default=[]),
    session_date: str = Form(...),
    notes: str = Form(None),
    symptom_image: Optional[UploadFile] = None,
    db: Session = Depends(get_db)
):
    if not symptoms or len(symptoms) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least three symptoms."
        )
    
    symptoms = [s.strip() for s in symptoms if s.strip()]
    
    if len(symptoms) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least three non-empty symptoms."
        )
    
    visit = db.query(DoctorVisit).filter(DoctorVisit.id == visit_id).first()
    
    if not visit:
        raise HTTPException(status_code=404, detail="Doctor visit not found in the database.")

    matched_diseases = diagnose_symptoms(symptoms, diseases_dict)
    if not matched_diseases:
        matched_diseases = ["No diseases found matched with your symptoms, try again"]
    
    symptom_image_url = None
    if symptom_image:
        try:
            symptom_image_url = await save_upload_file(symptom_image)
            print(f"File saved at {symptom_image_url}")
        except Exception as e:
            print(f"Error saving file: {e}")

    db_session = SymptomSession(
        visit_id=visit_id,
        session_date=session_date,
        symptoms=symptoms,
        symptom_image_url=symptom_image_url,
        diagnosis=matched_diseases,
        notes=notes
    )

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return db_session

@router.get("/", response_model=List[SymptomSessionResponse])
def get_symptom_sessions(
    visit_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    visit = db.query(DoctorVisit).filter(DoctorVisit.id == visit_id).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    sessions = db.query(SymptomSession).filter(
        SymptomSession.visit_id == visit_id
    ).order_by(
        SymptomSession.session_date.desc()
    ).offset(skip).limit(limit).all()
    
    return sessions

@router.get("/{session_id}", response_model=SymptomSessionResponse)
def get_symptom_session(
    visit_id: int,
    session_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    visit = db.query(DoctorVisit).filter(DoctorVisit.id == visit_id).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    session = db.query(SymptomSession).filter(
        SymptomSession.id == session_id,
        SymptomSession.visit_id == visit_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symptom session not found"
        )

    session_dict = {
        "id": session.id,
        "visit_id": session.visit_id,
        "session_date": session.session_date,
        "symptoms": session.symptoms,
        "diagnosis": session.diagnosis,
        "notes": session.notes,
        "symptom_image_url": get_file_url(request, session.symptom_image_url),
        "created_at": session.created_at,
        "updated_at": getattr(session, 'updated_at', None)
    }
    
    return session_dict

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_symptom_session(
    visit_id: int,
    session_id: int,
    db: Session = Depends(get_db)
):
    visit = db.query(DoctorVisit).filter(DoctorVisit.id == visit_id).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    session = db.query(SymptomSession).filter(
        SymptomSession.id == session_id,
        SymptomSession.visit_id == visit_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symptom session not found"
        )
    
    db.delete(session)
    db.commit()
    
    return None