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

class DoctorVisitBase(BaseModel):
    visit_date: date
    doctor_name: Optional[str] = None
    facility_name: Optional[str] = None
    notes: Optional[str] = None

class DoctorVisitCreate(DoctorVisitBase):
    clerk_user_id: str
    email: EmailStr

class DoctorVisitUpdate(BaseModel):
    clerk_user_id: str
    email: EmailStr
    visit_date: Optional[date] = None
    doctor_name: Optional[str] = None
    facility_name: Optional[str] = None
    notes: Optional[str] = None

class DoctorVisitResponse(DoctorVisitBase):
    id: int
    user_id: str
    email: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )

class SymptomSessionBase(BaseModel):
    session_date: datetime
    symptoms: List[str]
    symptom_image_url: Optional[str] = None
    notes: Optional[str] = None

    @validator('symptom_image_url')
    def validate_image_url(cls, v):
        if v is not None:
            valid_extensions = ['.jpg', '.jpeg', '.png', '.gif']
            if not any(v.lower().endswith(ext) for ext in valid_extensions) and not v.startswith('http'):
                raise ValueError('Invalid image URL. Must end with .jpg, .jpeg, .png, or .gif')
        return v

class SymptomSessionCreate(SymptomSessionBase):
    pass

class SymptomSessionResponse(SymptomSessionBase):
    id: int
    visit_id: int
    diagnosis: List[str]
    created_at: datetime

    @validator('symptoms', 'diagnosis', pre=True)
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    model_config = ConfigDict(
        from_attributes=True,
    )

class LabReportBase(BaseModel):
    report_name: str
    report_type: str
    doctor_name: Optional[str] = None
    report_date: date
    notes: Optional[str] = None
    file_url: str

class LabReportCreate(LabReportBase):
    pass

class LabReportUpdate(BaseModel):
    report_name: Optional[str] = None
    report_type: Optional[str] = None
    doctor_name: Optional[str] = None
    report_date: Optional[date] = None
    notes: Optional[str] = None
    file_url: Optional[str] = None

class LabReportResponse(LabReportBase):
    id: int
    visit_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )