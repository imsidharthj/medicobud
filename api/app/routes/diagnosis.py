from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import uuid4
from app.services.diagnosis_service import DiagnosisService
from app.services.interview_service import InterviewService
from app.db import get_db

# Initialize services
diagnosis_service = DiagnosisService(
    dataset_path="dataset.csv",
    weights_path="data/symptom_weights.csv"
)

interview_service = InterviewService(
    model_path="models/decision_tree.pkl",
    dataset_path="dataset.csv",
    relationships_path="data/symptom_relationships.csv"
)

router = APIRouter()

# Models
class IdentificationRequest(BaseModel):
    is_self: bool
    relation: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None

class BackgroundInfo(BaseModel):
    lifestyle: Dict[str, Any] = {}
    medical_history: Dict[str, Any] = {}
    medications: List[str] = []
    vaccinations: List[str] = []

class SymptomEntry(BaseModel):
    symptom: str
    severity: int
    duration: str
    additional_notes: Optional[str] = None

class DiagnosisRequest(BaseModel):
    symptoms: List[str]
    user_data: Dict[str, Any] = {}

class InterviewRequest(BaseModel):
    current_symptoms: List[str]
    last_asked_symptom: Optional[str] = None
    response: Optional[str] = None

class InterviewResponse(BaseModel):
    next_question: str
    is_complete: bool = False
    suggested_symptoms: List[str] = []

# Helper functions
def generate_session_id() -> str:
    """Generate a unique session ID."""
    return str(uuid4())

def update_session_background(session_id: str, background: Dict, db: Session):
    """Update session with background information."""
    # Implementation would store this in your database
    # For now, just a placeholder
    pass

def process_symptoms(symptoms: List[SymptomEntry]) -> List[str]:
    """Process symptoms from detailed entries to simple list."""
    return [entry.symptom for entry in symptoms]

# Routes
@router.post("/identify")
async def identify_patient(data: IdentificationRequest):
    """Initial endpoint to identify the patient."""
    return {
        "session_id": generate_session_id(),
        "is_self": data.is_self,
        "patient_info": {
            "relation": data.relation,
            "age": data.patient_age,
            "gender": data.patient_gender
        }
    }

@router.post("/background")
async def collect_background(
    data: BackgroundInfo,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Collect patient background information."""
    background_data = {
        "lifestyle": data.lifestyle,
        "medical_history": data.medical_history,
        "medications": data.medications,
        "vaccinations": data.vaccinations
    }
    
    # Store in session
    update_session_background(session_id, background_data, db)
    return {"status": "success", "background_data": background_data}

@router.post("/symptoms")
async def collect_symptoms(
    symptoms: List[SymptomEntry],
    session_id: str
):
    """Collect initial symptoms from the user."""
    processed_symptoms = process_symptoms(symptoms)
    return {"symptoms": processed_symptoms}

@router.post("/interview")
async def conduct_interview(request: InterviewRequest):
    """Handle the interactive symptom interview process."""
    try:
        if not request.current_symptoms:
            return InterviewResponse(
                next_question="Please provide at least one initial symptom.",
                is_complete=False
            )
        
        # Generate a consistent session ID based on the symptoms
        session_id = str(hash(tuple(sorted(request.current_symptoms))))
        
        # If this is the first time we've seen this session ID, initialize it
        if session_id not in interview_service.sessions:
            # Start the interview session
            initial_question = interview_service.start_interview(session_id)
            
            # Add any existing symptoms to the confirmed list
            session = interview_service.sessions[session_id]
            for symptom in request.current_symptoms:
                if symptom not in session['confirmed_symptoms']:
                    session['confirmed_symptoms'].append(symptom)
                    session['asked_symptoms'].add(symptom)
            
            # Get the first question based on these symptoms
            next_question = interview_service.process_input(session_id, "")
            
            return InterviewResponse(
                next_question=next_question,
                is_complete=False
            )
            
        # If we have a response to process (not the first call)
        if request.response:
            # Process the user's response and get the next question
            next_question = interview_service.process_input(session_id, request.response)
            
            # Check if we have enough symptoms for diagnosis
            session = interview_service.sessions[session_id]
            is_complete = len(session['confirmed_symptoms']) >= 3
            
            # Extract the symptom being asked about (if applicable)
            suggested_symptom = None
            if next_question.startswith("Are you experiencing "):
                suggested_symptom = next_question.split("Are you experiencing ")[1].rstrip("?")
            
            return InterviewResponse(
                next_question=next_question,
                is_complete=is_complete,
                suggested_symptoms=[suggested_symptom] if suggested_symptom else []
            )
        else:
            # No response provided but session exists - ask the next question
            next_question = interview_service.process_input(session_id, "")
            return InterviewResponse(
                next_question=next_question,
                is_complete=False
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview error: {str(e)}")

@router.post("/diagnose")
async def diagnose_symptoms(request: DiagnosisRequest):
    """Generate a diagnosis based on collected symptoms."""
    try:
        if not request.symptoms:
            raise HTTPException(status_code=400, detail="No symptoms provided")
        
        results = diagnosis_service.diagnose(request.symptoms, request.user_data)
        
        return {
            "success": True,
            "results": results.get("diagnosis", [])[:5],  # Return top 5 possible diagnoses
            "disclaimer": results.get("disclaimer", "This is an automated analysis and should not replace professional medical advice.")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagnosis error: {str(e)}")

@router.get("/symptoms-list")
async def get_symptom_list():
    """Get the list of all symptoms the system recognizes."""
    try:
        symptoms = interview_service.get_symptom_list()
        return {
            "success": True,
            "symptoms": symptoms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching symptom list: {str(e)}")