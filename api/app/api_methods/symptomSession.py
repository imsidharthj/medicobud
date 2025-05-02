from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, FastAPI
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from ..db import get_db
from ..models import DoctorVisit, SymptomSession
from ..schemas import SymptomSessionCreate, SymptomSessionResponse
from ..services import diagnose_symptoms
from ..utils import load_disease_data

router = APIRouter(
    prefix="/visits/{visit_id}/symptoms",
    tags=["symptoms"],
)

app = FastAPI()

diseases_dict = load_disease_data("dataset.csv")

@router.post("/", response_model=SymptomSessionResponse, status_code=status.HTTP_201_CREATED)
def diagnose_patient(visit_id: int, session: SymptomSessionCreate, db: Session = Depends(get_db)):
    if len(session.symptoms) < 3:
        raise HTTPException(status_code=400, detail="Please provide at least three symptoms.")
    
    visit = db.query(DoctorVisit).filter(DoctorVisit.id == visit_id).first()
    
    if not visit:
        raise HTTPException(status_code=404, detail="Doctor visit not found in the database.")

    matched_diseases = diagnose_symptoms(session.symptoms, diseases_dict)
    if not matched_diseases:
        matched_diseases = ["No diseases found matched with your symptoms, try again"]

    db_session = SymptomSession(
        visit_id=visit_id,
        session_date=session.session_date,
        symptoms=session.symptoms,
        symptom_image_url=session.symptom_image_url,
        diagnosis=matched_diseases,
        notes=session.notes
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
    
    return session

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