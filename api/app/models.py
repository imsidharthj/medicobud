# Updated models.py
from sqlalchemy import Column, String, Date, DateTime, Integer, ForeignKey, Text, Boolean, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship
from .db import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    allergies = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    doctor_visits = relationship("DoctorVisit", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    lab_records = relationship("LabRecords", back_populates="user")

class DoctorVisit(Base):
    __tablename__ = "doctor_visits"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    email = Column(String, ForeignKey('user_profiles.email'), nullable=False)
    visit_date = Column(Date, nullable=False)
    doctor_name = Column(String)
    facility_name = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("UserProfile", back_populates="doctor_visits")
    symptom_sessions = relationship("SymptomSession", back_populates="doctor_visit", cascade="all, delete-orphan")
    lab_reports = relationship("LabReport", back_populates="doctor_visit", cascade="all, delete-orphan")

class SymptomSession(Base):
    __tablename__ = "symptom_sessions"
    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey('doctor_visits.id', ondelete="CASCADE"), nullable=False)
    session_date = Column(DateTime(timezone=True), nullable=False)
    symptoms = Column(Text)
    symptom_image_url = Column(String, nullable=True)
    diagnosis = Column(Text)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    doctor_visit = relationship("DoctorVisit", back_populates="symptom_sessions")

class LabReport(Base):
    __tablename__ = "lab_reports"
    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey('doctor_visits.id', ondelete="CASCADE"), nullable=False)
    report_name = Column(String, nullable=False)
    report_type = Column(String, nullable=False)
    doctor_name = Column(String)
    report_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    file_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    doctor_visit = relationship("DoctorVisit", back_populates="lab_reports")

class LabRecords(Base):
    __tablename__ = "lab_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    email = Column(String, ForeignKey('user_profiles.email'), nullable=False)
    values = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("UserProfile", back_populates="lab_records")

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(String(50), primary_key=True, index=True)
    start_time = Column(DateTime, nullable=False, server_default=func.now())
    end_time = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=True)
    person_type = Column(String(20), nullable=True)
    person_details = Column(JSONB, nullable=True)
    
    email = Column(String, ForeignKey('user_profiles.email'), nullable=True)
    user_id = Column(String(50), nullable=True)
    
    user = relationship("UserProfile", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    summary = relationship("SessionSummary", back_populates="session", cascade="all, delete-orphan", uselist=False)

class Message(Base):
    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("sessions.session_id"), nullable=False)
    sender = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False, server_default=func.now())
    
    session = relationship("Session", back_populates="messages")

class SessionSummary(Base):
    __tablename__ = "session_summaries"

    session_id = Column(String(50), ForeignKey("sessions.session_id"), primary_key=True)
    symptoms = Column(JSONB, nullable=True)
    background_traits = Column(JSONB, nullable=True)
    diagnosis_results = Column(JSONB, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    session = relationship("Session", back_populates="summary")
