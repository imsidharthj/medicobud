from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import uuid4
from app.services.diagnosis_service import DiagnosisService
from app.services.interview_service import InterviewService
from app.services.session_service import SessionService
from app.db import get_db
from sqlalchemy.sql import text
from app.models import UserProfile

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

session_service = SessionService(interview_service, diagnosis_service)

router = APIRouter()

# New request models for better request handling
class SessionStartRequest(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    is_temp_user: Optional[bool] = False

# Existing Models (unchanged)
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

# New Model for Chat Input
class MessageInput(BaseModel):
    session_id: str
    text: str

# Helper functions (unchanged)
def generate_session_id() -> str:
    return str(uuid4())

def update_session_background(session_id: str, background: Dict, db: Session):
    pass  # Placeholder

def process_symptoms(symptoms: List[SymptomEntry]) -> List[str]:
    return [entry.symptom for entry in symptoms]

# Existing Routes (unchanged)
@router.post("/identify")
async def identify_patient(data: IdentificationRequest):
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
    background_data = {
        "lifestyle": data.lifestyle,
        "medical_history": data.medical_history,
        "medications": data.medications,
        "vaccinations": data.vaccinations
    }
    update_session_background(session_id, background_data, db)
    return {"status": "success", "background_data": background_data}

@router.post("/symptoms")
async def collect_symptoms(
    symptoms: List[SymptomEntry],
    session_id: str
):
    processed_symptoms = process_symptoms(symptoms)
    return {"symptoms": processed_symptoms}

@router.post("/interview")
async def conduct_interview(request: InterviewRequest):
    try:
        if not request.current_symptoms:
            return InterviewResponse(
                next_question="Please provide at least one initial symptom.",
                is_complete=False
            )
        
        session_id = str(hash(tuple(sorted(request.current_symptoms))))
        
        if session_id not in interview_service.sessions:
            initial_question = interview_service.start_interview(session_id)
            session = interview_service.sessions[session_id]
            for symptom in request.current_symptoms:
                if symptom not in session['confirmed_symptoms']:
                    session['confirmed_symptoms'].append(symptom)
                    session['asked_symptoms'].add(symptom)
            next_question = interview_service.process_input(session_id, "")
            return InterviewResponse(
                next_question=next_question,
                is_complete=False
            )
            
        if request.response:
            next_question = interview_service.process_input(session_id, request.response)
            session = interview_service.sessions[session_id]
            is_complete = len(session['confirmed_symptoms']) >= 3
            suggested_symptom = None
            if next_question.startswith("Are you experiencing "):
                suggested_symptom = next_question.split("Are you experiencing ")[1].rstrip("?")
            return InterviewResponse(
                next_question=next_question,
                is_complete=is_complete,
                suggested_symptoms=[suggested_symptom] if suggested_symptom else []
            )
        else:
            next_question = interview_service.process_input(session_id, "")
            return InterviewResponse(
                next_question=next_question,
                is_complete=False
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview error: {str(e)}")

@router.post("/diagnose")
async def diagnose_symptoms(request: DiagnosisRequest):
    try:
        if not request.symptoms:
            raise HTTPException(status_code=400, detail="No symptoms provided")
        results = diagnosis_service.diagnose(request.symptoms, request.user_data)
        return {
            "success": True,
            "results": results.get("diagnosis", [])[:5],
            "disclaimer": results.get("disclaimer", "This is an automated analysis and should not replace professional medical advice.")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagnosis error: {str(e)}")

@router.get("/symptoms-list")
async def get_symptom_list():
    try:
        symptoms = interview_service.get_symptom_list()
        return {
            "success": True,
            "symptoms": symptoms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching symptom list: {str(e)}")

# New Routes for Chat Interface
@router.post("/session/start")
async def start_session(
    request: SessionStartRequest,
    raw_request: Request,
    db: Session = Depends(get_db)
):
    try:
        await raw_request.json()
    except Exception as e:
        print(f"Error parsing request body: {str(e)}")
    
    # Check if this should be a temporary user session
    is_temp_user = request.is_temp_user or (not request.email and not request.user_id)
    
    if request.email and not is_temp_user:
        try:
            db.query(UserProfile).filter(UserProfile.email == request.email).first()
        except Exception as db_error:
            print(f"Database error looking up user: {str(db_error)}")
        
    try:
        result = session_service.start_session(
            db, 
            email=request.email, 
            user_id=request.user_id, 
            is_temp_user=is_temp_user
        )
        return result
    except Exception as e:
        print(f"ERROR creating session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Session creation error: {str(e)}")

@router.post("/session/message")
async def send_message(input: MessageInput, db: Session = Depends(get_db)):
    try:
        result = session_service.process_message(input.session_id, input.text, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred processing your message")

@router.get("/sessions")
async def list_sessions(
    email: Optional[str] = None,
    temp_user_id: Optional[str] = None,
    skip: int = 0, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    from app.temp.temp_user import temp_user_manager
    
    # Handle temporary user sessions
    if temp_user_id and temp_user_manager.is_temp_user(temp_user_id):
        sessions = temp_user_manager.get_temp_user_sessions(temp_user_id)
        # Apply pagination
        start_idx = skip
        end_idx = skip + limit
        return sessions[start_idx:end_idx]
    
    # Handle regular user sessions
    query = "SELECT session_id, start_time, email, status FROM sessions"
    params = {}
    
    if email:
        query += " WHERE email = :email"
        params["email"] = email
    else:
        return []
        
    query += " ORDER BY start_time DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    sessions = db.execute(text(query), params).fetchall()
    
    return [
        {
            "session_id": s[0], 
            "start_time": s[1],
            "email": s[2],
            "status": s[3],
            "is_temporary": False
        } for s in sessions
    ]

@router.get("/session/{session_id}")
async def get_session(
    session_id: str, 
    email: Optional[str] = None,
    temp_user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from app.temp.temp_user import temp_user_manager
    
    # Check if this is a temporary session
    temp_session = temp_user_manager.get_temp_session(session_id)
    if temp_session:
        # Verify access rights for temp user
        if temp_user_id and temp_session.get("user_id") != temp_user_id:
            raise HTTPException(status_code=403, detail="Access denied to this temporary session")
        
        return {
            "session_info": {
                "session_id": temp_session["session_id"],
                "start_time": temp_session["created_at"].isoformat(),
                "end_time": None,
                "status": temp_session.get("status", "in_progress"),
                "person_type": None,
                "person_details": None
            },
            "user": {
                "email": None,
                "user_id": temp_session.get("user_id"),
                "first_name": None,
                "last_name": None,
                "is_temporary": True
            },
            "messages": temp_session.get("messages", []),
            "summary": {
                "symptoms": temp_session.get("symptoms", []),
                "background_traits": temp_session.get("background_traits", {}),
                "diagnosis_results": temp_session.get("diagnosis_results", {})
            }
        }
    
    # Handle regular database sessions
    query = """SELECT s.session_id, s.start_time, s.end_time, s.status, 
                s.person_type, s.person_details, s.email, s.user_id,
                u.first_name, u.last_name
           FROM sessions s
           LEFT JOIN user_profiles u ON s.email = u.email
           WHERE s.session_id = :id"""
    
    params = {"id": session_id}
    
    if email:
        query += " AND s.email = :email"
        params["email"] = email
    
    session_data = db.execute(text(query), params).fetchone()
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    
    messages = db.execute(
        text("SELECT sender, text, timestamp FROM messages WHERE session_id = :id ORDER BY timestamp"),
        {"id": session_id}
    ).fetchall()
    
    summary = db.execute(
        text("SELECT symptoms, background_traits, diagnosis_results FROM session_summaries WHERE session_id = :id"),
        {"id": session_id}
    ).fetchone()
    
    user_info = None
    if session_data[6]:
        user_info = {
            "email": session_data[6],
            "user_id": session_data[7],
            "first_name": session_data[8],
            "last_name": session_data[9],
            "is_temporary": False
        }
    
    return {
        "session_info": {
            "session_id": session_data[0],
            "start_time": session_data[1],
            "end_time": session_data[2],
            "status": session_data[3],
            "person_type": session_data[4],
            "person_details": session_data[5]
        },
        "user": user_info,
        "messages": [{"sender": m[0], "text": m[1], "timestamp": m[2]} for m in messages],
        "summary": {
            "symptoms": summary[0] if summary else [],
            "background_traits": summary[1] if summary else {},
            "diagnosis_results": summary[2] if summary else {}
        }
    }

# New endpoint for temporary user management
@router.post("/temp-user/create")
async def create_temp_user():
    """Create a new temporary user"""
    from app.temp.temp_user import temp_user_manager
    
    temp_user_id = temp_user_manager.create_temp_user()
    return {
        "temp_user_id": temp_user_id,
        "message": "Temporary user created successfully"
    }

@router.delete("/temp-user/{temp_user_id}")
async def clear_temp_user(temp_user_id: str):
    """Clear all data for a temporary user"""
    from app.temp.temp_user import temp_user_manager
    
    if not temp_user_manager.is_temp_user(temp_user_id):
        raise HTTPException(status_code=404, detail="Temporary user not found")
    
    temp_user_manager.clear_temp_user_data(temp_user_id)
    return {"message": "Temporary user data cleared successfully"}

@router.get("/temp-stats")
async def get_temp_stats():
    """Get statistics about temporary users and sessions"""
    from app.temp.temp_user import temp_user_manager
    
    stats = temp_user_manager.get_session_count()
    return stats