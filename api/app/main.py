from fastapi import FastAPI, HTTPException, Depends, Query, APIRouter, Request, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
from contextlib import asynccontextmanager
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
from .lab_report.lab_report_api import router as lab_report_analysis_router
from .api_methods.symptomSession import router as symptom_session_router
from .routes.chat import router as chat_router
from .temp.temp_user import temp_user_manager
from .temp.temp_apis import router as temp_user_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Medicobud API started")
    yield
    print("🛑 Medicobud API stopped")

app = FastAPI(
    title="Medicobud API",
    description="Universal Healthcare API with Redis-based temporary user management",
    version="2.0.0",
    lifespan=lifespan
)

UI_URL = os.getenv("UI_URL", "http://app.medicobud.com")
ACTUAL_FRONTEND_ORIGIN = "https://medicobud.com"

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        UI_URL,
        ACTUAL_FRONTEND_ORIGIN,
        "https://app.medicobud.com",
        "https://medicobud.netlify.app",
        "*",
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
        "x-temp-user-id",
    ],
    expose_headers=["Content-Type", "Authorization", "x-temp-user-id"],
    max_age=86400,
)

diseases_dict = load_disease_data("dataset.csv")

app.include_router(webhook_router)
app.include_router(auth_router)
app.include_router(diagnosis_router, prefix="/api/diagnosis", tags=["diagnosis"])
app.include_router(profile_router)
app.include_router(doctor_visit_router)
app.include_router(lab_report_router)
app.include_router(lab_report_analysis_router)
app.include_router(symptom_session_router)
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(temp_user_router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {"message": "Medicobud API v2.0 - Universal Healthcare Platform"}
