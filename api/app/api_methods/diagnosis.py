from fastapi import APIRouter, HTTPException, Depends, Path, Query, FastAPI
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime
from app.db import get_db
from app.models import UserDiagnosis, UserProfile
from app.schemas import PatientData, MatchedDiseasesResponse, DiagnosisHistoryResponse
from app.services import diagnose_symptoms
from app.utils import load_disease_data, match_symptoms, unique_symptoms
from app.services import diagnose_symptoms

router = APIRouter(
    prefix="/api/diagnosis",
    tags=["diagnosis"]
)

app = FastAPI()

diseases_dict = load_disease_data("dataset.csv")

@router.post("/", response_model=MatchedDiseasesResponse)
def diagnose_patient(data: PatientData, db: Session = Depends(get_db)):
    if len(data.symptoms) < 3:
        raise HTTPException(status_code=400, detail="Please provide at least three symptoms.")
    print("diagnsis post request", data.email)

    user = db.query(UserProfile).filter(UserProfile.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in the database.")

    matched_diseases = diagnose_symptoms(data.symptoms, diseases_dict)
    if not matched_diseases:
        raise HTTPException(status_code=404, detail="No diseases matched the entered symptoms.")

    diagnosis_record = UserDiagnosis(
        user_id=user.clerk_user_id,
        email=data.email,
        symptoms=json.dumps(data.symptoms),
        predicted_disease=json.dumps(matched_diseases)
    )

    db.add(diagnosis_record)
    db.commit()
    db.refresh(diagnosis_record)

    return {
        "symptoms": data.symptoms,
        "matched_diseases": matched_diseases,
        "timestamp": diagnosis_record.timestamp,
    }

@router.get("/history", response_model=List[DiagnosisHistoryResponse])
def get_history( email: str = Query(..., description="User email"), db: Session = Depends(get_db) ):
    print(f"[GET HISTORY] Fetching diagnosis history for: {email}")

    user = db.query(UserProfile).filter(UserProfile.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in the database.")

    history = db.query(UserDiagnosis).filter(UserDiagnosis.email == email).all()
    if not history:
        print(f"[GET HISTORY] No diagnosis history found for email: {email}")
        return []
    
    print(f"[GET HISTORY] Retrieved {len(history)} records for email: {email}")
    return [
        {
            "id": record.id,
            "symptoms": json.loads(record.symptoms),
            "predicted_disease": json.loads(record.predicted_disease),
            "timestamp": record.timestamp
        }
        for record in history
    ]