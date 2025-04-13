# schemas.py
from datetime import date, datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, EmailStr, ConfigDict, validator
import json

class UserProfileBase(BaseModel):
    clerk_user_id: str
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    allergies: Optional[List[str]] = []

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    allergies: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    id: int
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(
        from_attributes=True,
    )

class PatientData(BaseModel):
    symptoms: List[str]
    user_id: Optional[str] = None
    email: EmailStr

class MatchedDiseasesResponse(BaseModel):
    symptoms: List[str]
    matched_diseases: List[str]
    timestamp: datetime

class DiagnosisHistoryResponse(BaseModel):
    id: int
    symptoms: List[str]
    predicted_disease: List[str]
    timestamp: datetime

    @validator('symptoms', 'predicted_disease', pre=True)
    def parse_json(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    model_config = ConfigDict(
        from_attributes=True,
    )