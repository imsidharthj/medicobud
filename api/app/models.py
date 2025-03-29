# models.py
from sqlalchemy import Column, String, Date, DateTime, Integer, ForeignKey, Text
from sqlalchemy.sql import func
from .db import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String)  # Changed from "name" to "first_name"
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    date_of_birth = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserDiagnosis(Base):
    __tablename__ = "user_diagnoses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('user_profiles.clerk_user_id'), nullable=True)
    name = Column(Text)
    age = Column(Text)
    gender = Column(Text)
    weight = Column(Text)
    allergies = Column(Text)
    symptoms = Column(Text)
    predicted_disease = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
