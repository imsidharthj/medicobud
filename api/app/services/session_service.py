from app.services.session_steps import SessionStepController
from app.services.diagnosis_service import DiagnosisService
from app.services.interview_service import InterviewService
from typing import Dict, Any
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SessionService:
    """Pure orchestrator for session management"""
    
    def __init__(self, interview_service: InterviewService, diagnosis_service: DiagnosisService):
        self.step_controller = SessionStepController(interview_service, diagnosis_service)
        self.sessions = {}  # In-memory session storage
    
    def start_session(self, db, email: str = None, user_id: str = None, is_temp_user: bool = False, temp_user_id: str = None, request = None) -> Dict[str, Any]:
        """Start a new diagnosis session"""
        try:
            # Use user_id if provided, otherwise use temp_user_id, otherwise generate one
            final_user_id = user_id or temp_user_id or f"temp_{int(datetime.now().timestamp())}"
            session_id = f"session_{final_user_id}_{int(datetime.now().timestamp())}"
            
            # Initialize session state
            session_state = {
                "session_id": session_id,
                "user_id": final_user_id,
                "email": email,
                "is_temp_user": is_temp_user,
                "temp_user_id": temp_user_id,
                "created_at": datetime.now().isoformat(),
                "status": "active"
            }
            
            # Store session
            self.sessions[session_id] = session_state
            
            # Get initial step from controller
            initial_step = self.step_controller.get_initial_step()
            
            return {
                "success": True,
                "session_id": session_id,
                "message": initial_step["message"],
                "current_step": initial_step["current_step"],
                "step_number": initial_step["step_number"],
                "total_steps": initial_step["total_steps"],
                "progress_percentage": initial_step["progress_percentage"]
            }
            
        except Exception as e:
            logger.error(f"Error starting session: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_message(self, session_id: str, user_input: str, temp_user_id: str = None) -> Dict[str, Any]:
        """Process user message and return next step instructions"""
        try:
            # Get session state
            session_state = self.sessions.get(session_id)
            if not session_state:
                return {
                    "success": False,
                    "error": "Session not found"
                }
            
            # Try to parse structured data
            try:
                structured_data = json.loads(user_input)
                current_step = structured_data.get("step")
                user_data = structured_data.get("data", {})
                
                # Process through step controller
                result = self.step_controller.process_step_response(current_step, user_data, session_state)
                
                # Update session state
                self.sessions[session_id] = session_state
                
                return result
                
            except json.JSONDecodeError:
                # Handle plain text input (fallback)
                return {
                    "success": False,
                    "error": "Please use the provided interface options",
                    "message": "Please select from the available options or use the structured interface."
                }
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_session(self, session_id: str) -> Dict[str, Any]:
        """Get session state"""
        session_state = self.sessions.get(session_id)
        if not session_state:
            return {"success": False, "error": "Session not found"}
        
        return {
            "success": True,
            "session_data": session_state
        }
    
    def save_session(self, session_id: str, db = None):
        """Save session to database (if needed)"""
        # Implement database saving logic if required
        pass