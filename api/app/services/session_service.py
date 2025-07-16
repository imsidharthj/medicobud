from app.services.session_steps import SessionStepController
from app.services.diagnosis_service import DiagnosisService
from app.services.interview_service import InterviewService
from typing import Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self, interview_service: InterviewService, diagnosis_service: DiagnosisService):
        self.step_controller = SessionStepController(interview_service, diagnosis_service)
        self.sessions = {}

    def start_session(self, db, email: str = None, user_id: str = None, is_temp_user: bool = False, temp_user_id: str = None, request = None) -> Dict[str, Any]:
        try:
            final_user_id = user_id or temp_user_id or f"temp_{int(datetime.now().timestamp())}"
            session_id = f"session_{final_user_id}_{int(datetime.now().timestamp())}"
            
            session_state = {
                "session_id": session_id,
                "user_id": final_user_id,
                "email": email,
                "is_temp_user": is_temp_user,
                "temp_user_id": temp_user_id,
                "created_at": datetime.now().isoformat(),
                "status": "active"
            }
            
            self.sessions[session_id] = session_state
            
            initial_step = self.step_controller.get_initial_step()
            
            return {
                "success": True,
                "session_id": session_id,
                "message": initial_step["message"],
                "current_step": initial_step["next_step"],
            }
            
        except Exception as e:
            logger.error(f"Error starting session: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_message(self, session_id: str, step: str, data: Dict[str, Any], db=None) -> Dict[str, Any]:
        try:
            session_state = self.sessions.get(session_id)
            if not session_state:
                raise ValueError("Session not found")
            
            if not step:
                raise ValueError("Missing 'step' in structured data")
            
            result = self.step_controller.process_message(session_state, step, data)
            
            self.sessions[session_id] = session_state
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_session(self, session_id: str) -> Dict[str, Any]:
        session_state = self.sessions.get(session_id)
        if not session_state:
            return {"success": False, "error": "Session not found"}
        
        return {
            "success": True,
            "session_data": session_state
        }
    
    def save_session(self, session_id: str, db = None):
        pass