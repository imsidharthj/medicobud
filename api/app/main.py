from fastapi import FastAPI, HTTPException, Depends, Query, APIRouter, Request, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
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
from .models import UserProfile
from .schemas import UserProfileBase, UserProfileCreate, UserProfileResponse, UserProfileUpdate, DoctorVisitCreate, DoctorVisitResponse, DoctorVisitUpdate, SymptomSessionCreate, SymptomSessionResponse, LabReportCreate, LabReportResponse, LabReportUpdate
from .utils import load_disease_data, match_symptoms, unique_symptoms
from .services import diagnose_symptoms
from dotenv import load_dotenv
from svix.webhooks import Webhook, WebhookVerificationError
from .routes.jwt import verify_clerk_jwt, get_current_user_optional, get_current_user
from .routes.webhook import router as webhook_router
from .routes.auth import router as auth_router
from .routes.diagnosis import router as diagnosis_router
from .api_methods.profile import router as profile_router
from .api_methods.doctorVisit import router as doctor_visit_router
from .api_methods.labReport import router as lab_report_router
from .api_methods.symptomSession import router as symptom_session_router
from .routes.chat import router as chat_router
from fastapi.staticfiles import StaticFiles

load_dotenv()

UI_URL = os.getenv("UI_URL", "http://app.medicobud.com")  # Default from .env or code
ACTUAL_FRONTEND_ORIGIN = "https://medicobud.com"  # The origin shown in browser errors

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Comprehensive CORS configuration for all possible origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # For local UI development
        "https://localhost:3000",  # For local UI development (https)
        UI_URL,  # From your .env file (currently http://app.medicobud.com)
        ACTUAL_FRONTEND_ORIGIN,  # Explicitly add the problematic origin
        "https://app.medicobud.com",  # If you use this variation
        "https://medicobud.netlify.app",  # If you also use a Netlify subdomain
        "*",  # Wildcard for broad compatibility during debugging (consider restricting in full production)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "svix-id",
        "svix-timestamp",
        "svix-signature",
        # Add any other custom headers your frontend might send
    ],
    expose_headers=["Content-Type", "Authorization"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

diseases_dict = load_disease_data("dataset.csv")

app.include_router(webhook_router)
app.include_router(auth_router)
app.include_router(diagnosis_router, prefix="/api/diagnosis", tags=["diagnosis"])
app.include_router(profile_router)
app.include_router(doctor_visit_router)
app.include_router(lab_report_router)
app.include_router(symptom_session_router)
app.include_router(chat_router, prefix="/api", tags=["chat"])

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {"message": "This is the Diagnosis API."}
