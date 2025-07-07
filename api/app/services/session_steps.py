from typing import Dict, Any, List
from datetime import datetime
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)

class DiagnosisStep(Enum):
    """Enum for diagnosis flow steps"""
    GREETING = "greeting"
    BACKGROUND_TRAITS = "background_traits"
    SUBSTANCES = "substances"
    TRAVELED = "traveled"
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
        elif step == "substances":
            return self._process_substances_step(data, session_state)
        elif step == "traveled":
            return self._process_traveled_step(data, session_state)
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
            "message": "Have you used any substances like smoking, alcohol, or recreational drugs?",
            "next_step": "substances"
        }

    def _process_substances_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process substances information"""
        return {
            "success": True,
            "message": "Have you traveled recently or been to any new places?",
            "next_step": "traveled"
        }

    def _process_traveled_step(self, data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process travel information"""
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
            "background_traits": "substances",
            "substances": "traveled",
            "traveled": "symptoms", 
            "symptoms": "timing_intensity",
            "timing_intensity": "care_medication",
            "care_medication": "cross_questioning",
            "cross_questioning": "diagnosis",
            "diagnosis": "results"
        }
        
        return step_flow.get(current_step, "results")

    def _extract_background_data(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and validate background data - pass raw data to diagnosis service"""
        background_data = {}
        
        # Collect all step data without transformation - now including substances and traveled
        for step in ["background_traits", "substances", "traveled", "timing_intensity", "care_medication"]:
            if step in session_state:
                background_data.update(session_state[step])
        
        # Only basic validation - let diagnosis_service handle the rest
        validated_data = {}
        for key, value in background_data.items():
            if value is not None and str(value).strip():
                validated_data[key] = value
        
        return validated_data

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

    def _validate_step_data(self, step: str, data: Dict[str, Any]) -> bool:
        """Validate step data"""
        validation_rules = {
            "greeting": lambda d: "response" in d,
            "background_traits": lambda d: "person_type" in d,
            "substances": lambda d: "substances" in d,
            "traveled": lambda d: "travel_history" in d,
            "symptoms": lambda d: "symptoms" in d and isinstance(d["symptoms"], list) and len(d["symptoms"]) >= 1,
            "timing_intensity": lambda d: any(key in d for key in ["timing", "onset", "severity", "temperature"]),
            "care_medication": lambda d: "medical_care" in d,
        }
        
        validator = validation_rules.get(step)
        return validator(data) if validator else True


class SessionStepController:
    """Controls the diagnosis flow and sends step rendering instructions to frontend"""
    
    def __init__(self, interview_service, diagnosis_service):
        self.interview_service = interview_service
        self.diagnosis_service = diagnosis_service
        self.data_processor = SessionDataProcessor(interview_service, diagnosis_service)
        
        # Define the complete step flow
        self.step_flow = [
            DiagnosisStep.GREETING,
            DiagnosisStep.BACKGROUND_TRAITS,
            DiagnosisStep.SUBSTANCES,
            DiagnosisStep.TRAVELED,
            DiagnosisStep.SYMPTOMS,
            DiagnosisStep.TIMING_INTENSITY,
            DiagnosisStep.CARE_MEDICATION,
            DiagnosisStep.CROSS_QUESTIONING,
            DiagnosisStep.DIAGNOSIS,
            DiagnosisStep.RESULTS
        ]
    
    def get_initial_step(self) -> Dict[str, Any]:
        """Get the initial step for starting a session"""
        return {
            "success": True,
            "message": "How are you feeling today?",
            "current_step": "greeting",
            "step_number": 1,
            "total_steps": len(self.step_flow),
            "progress_percentage": 0
        }
    
    def process_step_response(self, current_step: str, user_data: Dict[str, Any], session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process user response and determine next step"""
        try:
            # Store the user data
            self._store_step_data(current_step, user_data, session_state)
            
            # Validate the data
            if not self._validate_step_data(current_step, user_data):
                return {
                    "success": False,
                    "message": f"Please provide valid information for {current_step}",
                    "current_step": current_step
                }
            
            # Process the step and get next step
            next_step = self._determine_next_step(current_step, user_data, session_state)
            
            # Handle special cases
            if next_step == DiagnosisStep.CROSS_QUESTIONING:
                return self._handle_cross_questioning(session_state)
            elif next_step == DiagnosisStep.DIAGNOSIS:
                return self._handle_diagnosis(session_state)
            elif next_step == DiagnosisStep.RESULTS:
                return self._handle_results(session_state)
            
            # Return next step with appropriate message
            return self._get_step_message(next_step, session_state)
            
        except Exception as e:
            logger.error(f"Error processing step {current_step}: {str(e)}")
            return {
                "success": False,
                "message": "An error occurred processing your response",
                "error": str(e)
            }
    
    def _get_step_message(self, step: DiagnosisStep, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Get the appropriate message for each step"""
        
        step_messages = {
            DiagnosisStep.GREETING: "How are you feeling today?",
            DiagnosisStep.BACKGROUND_TRAITS: "Are you answering these questions for yourself or someone else?",
            DiagnosisStep.SUBSTANCES: "Have you used any substances like smoking, alcohol, or recreational drugs?",
            DiagnosisStep.TRAVELED: "Have you traveled recently or been to any new places?",
            DiagnosisStep.SYMPTOMS: "Please describe the symptoms you're currently experiencing.",
            DiagnosisStep.TIMING_INTENSITY: "When did your symptoms start?",
            DiagnosisStep.CARE_MEDICATION: "Have you visited a doctor recently or are you currently taking any medication?",
        }
        
        message = step_messages.get(step, "Please continue...")
        
        # Add progress information
        current_index = self.step_flow.index(step) if step in self.step_flow else 0
        
        return {
            "success": True,
            "message": message,
            "current_step": step.value,
            "step_number": current_index + 1,
            "total_steps": len(self.step_flow),
            "progress_percentage": int((current_index / (len(self.step_flow) - 1)) * 100) if len(self.step_flow) > 1 else 100
        }

    def _store_step_data(self, step: str, data: Dict[str, Any], session_state: Dict[str, Any]):
        """Store step data in session state"""
        if step not in session_state:
            session_state[step] = {}
        session_state[step].update(data)
        session_state["last_updated_step"] = step
        session_state["updated_at"] = datetime.now().isoformat()
    
    def _validate_step_data(self, step: str, data: Dict[str, Any]) -> bool:
        """Validate step data"""
        validation_rules = {
            "greeting": lambda d: "response" in d,
            "background_traits": lambda d: "person_type" in d,
            "substances": lambda d: "substances" in d,
            "traveled": lambda d: "travel_history" in d,
            "symptoms": lambda d: "symptoms" in d and isinstance(d["symptoms"], list) and len(d["symptoms"]) >= 1,
            "timing_intensity": lambda d: any(key in d for key in ["timing", "onset", "severity", "temperature"]),
            "care_medication": lambda d: "medical_care" in d,
        }
        
        validator = validation_rules.get(step)
        return validator(data) if validator else True
    
    def _determine_next_step(self, current_step: str, user_data: Dict[str, Any], session_state: Dict[str, Any]) -> DiagnosisStep:
        """Determine next step based on current step and user data"""
        
        # Handle special routing logic
        if current_step == "greeting" and user_data.get("response") == "lab_report_analysis":
            return DiagnosisStep.RESULTS  # Special redirect
        
        if current_step == "symptoms":
            symptoms = session_state.get("symptoms", {}).get("symptoms", [])
            if len(symptoms) < 3:
                return DiagnosisStep.SYMPTOMS  # Stay on symptoms step
        
        # Normal flow progression
        try:
            current_enum = DiagnosisStep(current_step)
            current_index = self.step_flow.index(current_enum)
            if current_index < len(self.step_flow) - 1:
                return self.step_flow[current_index + 1]
        except (ValueError, IndexError):
            pass
        
        return DiagnosisStep.RESULTS
    
    def _handle_cross_questioning(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cross-questioning step"""
        try:
            symptoms = session_state.get("symptoms", {}).get("symptoms", [])
            session_id = session_state.get("session_id", f"session_{datetime.now().timestamp()}")
            
            if not session_state.get("cross_questioning_started"):
                session_state["cross_questioning_started"] = True
                question = self.interview_service.start_interview(session_id, symptoms)
            else:
                last_response = session_state.get("last_cross_questioning_response", "")
                question = self.interview_service.process_input(session_id, last_response)
            
            # Return simple format like other steps, not nested render_step
            return {
                "success": True,
                "message": question,
                "next_step": "cross_questioning",
                "interview_active": True
            }
        except Exception as e:
            logger.error(f"Cross-questioning error: {e}")
            return self._handle_diagnosis(session_state)
    
    def _handle_diagnosis(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle diagnosis generation"""
        return self.data_processor._trigger_diagnosis(session_state)
    
    def _handle_results(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle results display"""
        return {
            "success": True,
            "render_step": {
                "step": "results",
                "message": "Session complete",
                "ui_type": "results"
            },
            "session_complete": True
        }