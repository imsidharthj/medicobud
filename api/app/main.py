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
from .models import UserDiagnosis, UserProfile
from .schemas import  PatientData, MatchedDiseasesResponse, UserProfileBase, UserProfileCreate, UserProfileResponse, UserProfileUpdate, DiagnosisHistoryResponse
from .utils import load_disease_data, match_symptoms, unique_symptoms
from .services import diagnose_symptoms
from dotenv import load_dotenv
from svix.webhooks import Webhook, WebhookVerificationError
from .routes.jwt import verify_clerk_jwt, get_current_user_optional, get_current_user
from .routes.webhook import router as webhook_router
from .routes.auth import router as auth_router
from .api_methods.diagnosis import router as diagnosis_router
from .api_methods.profile import router as profile_router

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
app.include_router(auth_router)
app.include_router(diagnosis_router)
app.include_router(profile_router)


@app.get("/")
def root():
    return {"message": "This is the Diagnosis API."}
