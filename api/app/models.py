# models.py
from sqlalchemy import Column, String, Date, DateTime, Integer, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from .db import Base
from sqlalchemy.orm import relationship

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String)  # Changed from "name" to "first_name"
    last_name = Column(String)
    email = Column(String, unique=True, index=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    allergies = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    diagnoses = relationship("UserDiagnosis", back_populates="user")


class UserDiagnosis(Base):
    __tablename__ = "user_diagnoses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True)
    email = Column(String, ForeignKey('user_profiles.email'), nullable=False)
    symptoms = Column(Text)
    predicted_disease = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("UserProfile", back_populates="diagnoses")
