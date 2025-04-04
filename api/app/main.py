from fastapi import FastAPI, HTTPException, Depends, Query, APIRouter, Request, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
# import asyncpg
from sqlalchemy.orm import Session
from fuzzywuzzy import fuzz
from typing import List
from dotenv import load_dotenv
import requests
from pydantic import ValidationError, BaseModel
import hmac
import hashlib
import json
import os
from typing import Literal, Optional, List
from .db import engine, Base, get_db
from .models import UserDiagnosis, UserProfile
from .schemas import  PatientData, MatchedDiseasesResponse, UserProfileBase, UserProfileCreate, UserProfileResponse, UserProfileUpdate, DiagnosisHistoryResponse
from .utils import load_disease_data, match_symptoms, unique_symptoms
from .services import diagnose_symptoms
from dotenv import load_dotenv
from svix.webhooks import Webhook, WebhookVerificationError
# from app.api_.webhooks.routes import router as clerk_router
# from .env import JWKS_URL, ISSUER, CLERK_WEBHOOK_SIGNING_SECRET
from .routes.jwt import verify_clerk_jwt, get_current_user_optional, get_current_user
from .routes.webhook import router as webhook_router

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

diseases_dict = load_disease_data("dataset.csv")

app.include_router(webhook_router)


@app.get("/")
def root():
    return {"message": "This is the Diagnosis API."}


@app.post("/diagnosis", response_model=MatchedDiseasesResponse)
def diagnose_patient(data: PatientData, db: Session = Depends(get_db)):
    if len(data.symptoms) < 3:
        raise HTTPException(status_code=400, detail="Please provide at least three symptoms.")
    print("diagnsis post request", data.name, data.age)

    user_id = data.user_id if hasattr(data, "user_id") else None
    print("user_id", user_id)
    email = data.email if hasattr(data, "email") else None
    print("email", email)

    matched_diseases = diagnose_symptoms(data.symptoms, diseases_dict)
    if not matched_diseases:
        raise HTTPException(status_code=404, detail="No diseases matched the entered symptoms.")

    diagnosis_record = UserDiagnosis(
        user_id=user_id,
        email=email,
        name=data.name,
        age=str(data.age),
        gender=data.gender,
        weight=data.weight,
        allergies=json.dumps(data.allergies),
        symptoms=json.dumps(data.symptoms),
        predicted_disease=json.dumps(matched_diseases)
    )

    db.add(diagnosis_record)
    db.commit()
    db.refresh(diagnosis_record)

    return {
        "name": data.name,
        "age": data.age,
        "symptoms": data.symptoms,
        "matched_diseases": matched_diseases,
    }


@app.get("/profile", response_model=UserProfileResponse)
def get_profile( email: str, db: Session = Depends(get_db) ):
    print(f'[GET PROFILE] Fetching profile for: {email}')
    profile = db.query(UserProfile).filter_by(email=email, is_active=True).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/profile", response_model=UserProfileResponse)
def update_profile( update_data: UserProfileUpdate, email: str, db: Session = Depends(get_db) ):
    print(f'[UPDATE PROFILE] Updating profile for: {email}')
    profile = db.query(UserProfile).filter_by(email=email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile


@app.get("/diagnosis/history", response_model=List[DiagnosisHistoryResponse])
def get_history( email: str, db: Session = Depends(get_db) ):
    print(f"[GET HISTORY] Fetching diagnosis history for: {email}")
    history = db.query(UserDiagnosis).filter_by(email=email).all()
    if not history:
        raise HTTPException(f"[GET HISTORY] No diagnosis history found for user_id: {email}")
    else:
        print(f"[GET HISTORY] Retrieved {len(history)} records for user_id: {email}")
    return history
