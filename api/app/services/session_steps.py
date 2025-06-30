from typing import Dict, Any
from datetime import datetime
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)

class DiagnosisStep(Enum):
    """Enum for diagnosis flow steps"""
    GREETING = "greeting"
    BACKGROUND_TRAITS = "background_traits"
    SYMPTOMS = "symptoms"
    TIMING_INTENSITY = "timing_intensity"
    CARE_MEDICATION = "care_medication"
    CROSS_QUESTIONING = "cross_questioning"
    DIAGNOSIS = "diagnosis"
    RESULTS = "results"

class SessionDataProcessor:
    """Enhanced data processor that handles structured data and triggers diagnosis appropriately"""
    
    def __init__(self, interview_service, diagnosis_service):
        self.interview_service = interview_service
        self.diagnosis_service = diagnosis_service

    def process_step_data(self, step: str, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process structured data from frontend and determine next actions"""
        
        # Store the step data
        if step not in session_state:
            session_state[step] = {}
        session_state[step].update(data)
        session_state["last_updated_step"] = step
        session_state["updated_at"] = datetime.now().isoformat()
        
        # Process specific step logic
        if step == "greeting":
            return self._process_greeting_step(data, session_state)
        elif step == "background_traits":
            return self._process_background_step(data, session_state)
        elif step == "symptoms":
            return self._process_symptoms_step(data, session_state)
        elif step == "timing_intensity":
            return self._process_timing_step(data, session_state)
        elif step == "care_medication":
            return self._process_care_step(data, session_state)
        elif step == "cross_questioning":
            return self._process_cross_questioning_step(data, session_state)
        else:
            # Generic processing
            next_step = self._determine_next_step(step, data, session_state)
            return {
                "success": True,
                "message": f"{step} data recorded successfully",
                "next_step": next_step,
                "session_data": session_state
            }

    def _process_greeting_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process greeting response"""
        if data.get("redirect"):
            return {
                "success": True,
                "message": "Redirecting to requested service",
                "redirect": data["redirect"]
            }
        
        if data.get("wants_analysis", True):
            return {
                "success": True,
                "message": "Are you answering these questions for yourself or someone else?",
                "next_step": "background_traits"
            }
        else:
            return {
                "success": True,
                "message": "Thank you! Feel free to return if you need health assistance.",
                "next_step": "results"
            }

    def _process_background_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process background information"""
        return {
            "success": True,
            "message": "Please describe the symptoms you're currently experiencing.",
            "next_step": "symptoms"
        }

    def _process_symptoms_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process symptoms and determine if enough collected"""
        symptoms = data.get("symptoms", [])
        
        # Accumulate symptoms across multiple inputs
        if "symptoms" not in session_state:
            session_state["symptoms"] = {"symptoms": []}
        
        existing_symptoms = session_state["symptoms"].get("symptoms", [])
        all_symptoms = list(set(existing_symptoms + symptoms))  # Remove duplicates
        session_state["symptoms"]["symptoms"] = all_symptoms
        
        if len(all_symptoms) >= 3:
            return {
                "success": True,
                "message": "When did your symptoms start?",
                "next_step": "timing_intensity"
            }
        else:
            return {
                "success": True,
                "message": f"You've provided {len(all_symptoms)} symptom(s). Please describe any additional symptoms you're experiencing.",
                "next_step": "symptoms"
            }

    def _process_timing_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process timing and intensity information"""
        return {
            "success": True,
            "message": "Have you visited a doctor recently or are you currently taking any medication?",
            "next_step": "care_medication"
        }

    def _process_care_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process care and medication info, then trigger diagnosis or cross-questioning"""
        
        symptoms = session_state.get("symptoms", {}).get("symptoms", [])
        
        # If there are enough symptoms, start cross-questioning to refine them
        if len(symptoms) >= 3 and session_state.get("cross_questioning_started") is not True:
            session_state["cross_questioning_started"] = True
            session_id = session_state.get("session_id", f"session_{datetime.now().timestamp()}")
            session_state["session_id"] = session_id
            
            try:
                initial_question = self.interview_service.start_interview(session_id, symptoms)
                return {
                    "success": True,
                    "message": initial_question,
                    "next_step": "cross_questioning",
                    "interview_active": True
                }
            except Exception as e:
                logger.error(f"Error starting interview, proceeding to diagnosis: {e}")
                return self._trigger_diagnosis(session_state)
        
        # Otherwise, proceed to diagnosis
        return self._trigger_diagnosis(session_state)

    def _process_cross_questioning_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cross-questioning using InterviewService"""
        try:
            session_id = session_state.get("session_id")
            user_response = data.get("response", "")
            
            if not session_id:
                logger.error("No session_id for cross-questioning")
                return self._trigger_diagnosis(session_state)
            
            # Process response through interview service
            next_question = self.interview_service.process_input(session_id, user_response)
            
            # Check multiple conditions for interview completion
            interview_state = self.interview_service.sessions.get(session_id, {})
            is_complete = (
                interview_state.get('current_step') == 'results' or
                next_question.startswith("Based on your symptoms") or
                next_question.startswith("Could not determine") or
                next_question.startswith("Diagnosis") or
                len(interview_state.get("confirmed_symptoms", [])) >= 5 or  # Stop after 5 confirmed symptoms
                len(interview_state.get("previous_questions", set())) >= 8   # Stop after 8 questions asked
            )
            
            # Update session with confirmed symptoms from interview
            if interview_state and interview_state.get("confirmed_symptoms"):
                confirmed_symptoms = interview_state["confirmed_symptoms"]
                current_symptoms = set(session_state.get("symptoms", {}).get("symptoms", []))
                new_symptoms = [s for s in confirmed_symptoms if s not in current_symptoms]
                
                if new_symptoms:
                    session_state["symptoms"]["symptoms"].extend(new_symptoms)
                    logger.info(f"Added new symptoms from interview: {new_symptoms}")
            
            # Track cross-questioning attempts to prevent infinite loops
            cross_questioning_count = session_state.get("cross_questioning_count", 0)
            session_state["cross_questioning_count"] = cross_questioning_count + 1
            
            # Force completion after too many iterations
            if cross_questioning_count >= 10:
                logger.warning(f"Cross-questioning exceeded maximum iterations ({cross_questioning_count}), forcing diagnosis")
                is_complete = True
            
            if is_complete:
                # Interview complete, trigger diagnosis
                logger.info(f"Cross-questioning complete. Confirmed symptoms: {interview_state.get('confirmed_symptoms', [])}")
                return self._trigger_diagnosis(session_state)
            else:
                # Continue interview
                return {
                    "success": True,
                    "message": next_question,
                    "next_step": "cross_questioning",
                    "interview_active": True
                }
                
        except Exception as e:
            logger.error(f"Error in cross-questioning: {str(e)}")
            # Fallback to diagnosis
            return self._trigger_diagnosis(session_state)

    def _trigger_diagnosis(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger final diagnosis generation"""
        try:
            # Extract symptoms
            symptoms = session_state.get("symptoms", {}).get("symptoms", [])
            if not symptoms:
                return {
                    "success": False,
                    "message": "No symptoms available for diagnosis"
                }
            
            # Extract background data
            background_data = self._extract_background_data(session_state)
            
            logger.info(f"Generating diagnosis for symptoms: {symptoms} with background: {background_data}")
            
            # Generate diagnosis
            diagnosis_data = self.diagnosis_service.diagnose(symptoms, background_data)
            
            # Store results
            session_state["diagnosis_results"] = diagnosis_data.get("diagnosis", [])
            session_state["diagnosis_timestamp"] = datetime.now().isoformat()
            
            return {
                "success": True,
                "message": "Analysis complete. Here are your results:",
                "next_step": "results",
                "diagnosis_data": {
                    "diagnosis": diagnosis_data.get("diagnosis", []),
                    "secondary_diagnosis": diagnosis_data.get("secondary_diagnosis", []),
                    "symptoms_analyzed": symptoms,
                    "background_data": background_data,
                    "disclaimer": diagnosis_data.get("disclaimer", ""),
                    "is_complete": True
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating diagnosis: {str(e)}")
            return {
                "success": False,
                "message": "Error generating diagnosis. Please try again.",
                "error": str(e)
            }

    def _determine_next_step(self, current_step: str, data: Dict[str, Any], session_state: Dict[str, Any]) -> str:
        """Determine next step in the flow"""
        step_flow = {
            "greeting": "background_traits",
            "background_traits": "symptoms", 
            "symptoms": "timing_intensity",
            "timing_intensity": "care_medication",
            "care_medication": "cross_questioning",
            "cross_questioning": "diagnosis",
            "diagnosis": "results"
        }
        
        return step_flow.get(current_step, "results")

    def _extract_background_data(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and normalize background data for diagnosis service"""
        background_data = {}
        
        # Get all background information
        for step in ["background_traits", "timing_intensity", "care_medication"]:
            if step in session_state:
                background_data.update(session_state[step])
        
        # Normalize common fields
        normalized_data = {}
        for key, value in background_data.items():
            if isinstance(value, str):
                value_lower = value.lower()
                if value_lower in ["yes", "y", "true", "1"]:
                    normalized_data[key] = "yes"
                elif value_lower in ["no", "n", "false", "0"]:
                    normalized_data[key] = "no"
                else:
                    normalized_data[key] = value
            else:
                normalized_data[key] = value
        
        return normalized_data

    def get_session_summary(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Get comprehensive session summary"""
        return {
            "greeting": session_state.get("greeting", {}),
            "background_traits": session_state.get("background_traits", {}),
            "symptoms": session_state.get("symptoms", {}),
            "timing_intensity": session_state.get("timing_intensity", {}),
            "care_medication": session_state.get("care_medication", {}),
            "cross_questioning": session_state.get("cross_questioning", []),
            "diagnosis_results": session_state.get("diagnosis_results"),
            "diagnosis_timestamp": session_state.get("diagnosis_timestamp"),
            "last_updated_step": session_state.get("last_updated_step"),
            "updated_at": session_state.get("updated_at")
        }

class DiagnosisFlowManager:
    """Enhanced flow manager that properly handles structured data and integrates all services"""
    
    def __init__(self, interview_service, diagnosis_service):
        self.data_processor = SessionDataProcessor(interview_service, diagnosis_service)

    def get_initial_message(self) -> str:
        """Get initial greeting message"""
        return "How are you feeling today?"

    def process_user_input(self, current_step, user_input: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process user input - handles both structured JSON and natural language"""
        
        try:
            # Ensure session_id exists
            if "session_id" not in session_data:
                session_data["session_id"] = f"session_{datetime.now().timestamp()}"
            
            # Check for special redirects
            if "lab_report_analysis" in user_input.lower():
                return {
                    "success": True,
                    "redirect": "lab_report_analysis",
                    "message": "Redirecting to Lab Report Analysis"
                }
            
            # Try to parse structured JSON data from frontend
            structured_data = self._try_parse_json(user_input)
            if structured_data:
                step = structured_data.get("step", "symptoms")
                step_data = structured_data.get("data", {})
                
                logger.info(f"Processing structured data - Step: {step}, Data: {step_data}")
                
                result = self.data_processor.process_step_data(step, step_data, session_data)
                
                # Handle special cases
                if "redirect" in result:
                    return result
                
                if "diagnosis_data" in result:
                    return {
                        "success": True,
                        "message": result["message"],
                        "next_step": result["next_step"],
                        "diagnosis_data": result["diagnosis_data"]
                    }
                
                return {
                    "success": True,
                    "message": result["message"],
                    "next_step": result["next_step"]
                }
            
            # Handle manual diagnosis trigger
            if user_input.lower() in ["diagnose", "analyze", "diagnosis"]:
                diagnosis_result = self.data_processor._trigger_diagnosis(session_data)
                
                if "diagnosis_data" in diagnosis_result:
                    return {
                        "success": True,
                        "message": diagnosis_result["message"],
                        "next_step": "results",
                        "diagnosis_data": diagnosis_result["diagnosis_data"]
                    }
                else:
                    return {
                        "success": False,
                        "message": diagnosis_result["message"],
                        "error": diagnosis_result.get("error")
                    }
            
            # Default response for unstructured input
            return {
                "success": True,
                "message": "Thank you for the information. Please continue with the next step.",
                "next_step": current_step.value if hasattr(current_step, 'value') else str(current_step)
            }
                
        except Exception as e:
            logger.error(f"Error processing user input: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "I encountered an issue. Could you please try again?"
            }

    def _try_parse_json(self, user_input: str) -> Dict[str, Any]:
        """Try to parse user input as JSON"""
        try:
            if user_input.startswith("{"):
                return json.loads(user_input)
        except json.JSONDecodeError:
            pass
        return None

    def get_step_progress(self, current_step) -> Dict[str, Any]:
        """Get progress information for current step"""
        steps = ["greeting", "background_traits", "symptoms", "timing_intensity", "care_medication", "cross_questioning", "diagnosis", "results"]
        current_step_str = current_step.value if hasattr(current_step, 'value') else str(current_step)
        
        try:
            current_index = steps.index(current_step_str)
        except ValueError:
            current_index = 0
        
        return {
            "current_step": current_step_str,
            "step_number": current_index + 1,
            "total_steps": len(steps),
            "progress_percentage": int((current_index / (len(steps) - 1)) * 100),
            "completed_steps": steps[:current_index]
        }