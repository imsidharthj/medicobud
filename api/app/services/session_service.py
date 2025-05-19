from typing import Dict, Any, Optional
from app.services.interview_service import InterviewService
from app.services.diagnosis_service import DiagnosisService
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import uuid4
import json

class SessionService:
    def __init__(self, interview_service: InterviewService, diagnosis_service: DiagnosisService):
        self.interview_service = interview_service
        self.diagnosis_service = diagnosis_service
        self.sessions = {}  # In-memory session storage (persisted via DB)
        self.steps = [
            "greeting",
            "start_analysis",
            "identify_person",
            "background_traits",
            "symptoms",
            "timing_intensity",
            "care_medication",
            "cross_questioning",
            "results"
        ]
        self.static_questions = {
            "identify_person": [
                "Are you answering these questions for yourself or someone else?"
            ],
            "background_traits": [
                "Have you used any substances recently, such as smoking, alcohol, or opioids?",
                "Have you recently traveled long-distance or are you currently taking any medications?"
            ],
            "symptoms": [
                "Please describe the symptoms you're currently experiencing."
            ],
            "timing_intensity": [
                "When did your symptoms start?",
                "On a scale from 1 to 10, how severe is the pain?",
                "Do you have a fever? What's your temperature?"
            ],
            "care_medication": [
                "Have you visited a doctor recently?",
                "Are you currently taking any medication? If so, which and when?"
            ]
        }

    def start_session(self, db: Session, email: str = None, user_id: str = None) -> Dict[str, Any]:
        session_id = str(uuid4())
        self.sessions[session_id] = {
            "current_step": "greeting",
            "person_type": None,
            "person_details": {},
            "background_traits": {},
            "symptoms": [],
            "timing_intensity": {},
            "care_medication": {},
            "interview_session_id": None,
            "diagnosis_results": None,
            "asked_questions": {step: [] for step in self.static_questions}
        }
        first_message = "How are you feeling today?"
        
        # Create the session entry FIRST
        db.execute(
            text("""INSERT INTO sessions 
               (session_id, start_time, status, email, user_id) 
               VALUES (:id, :start, :status, :email, :user_id)"""),
            {
                "id": session_id, 
                "start": datetime.now(), 
                "status": "in_progress", 
                "email": email,
                "user_id": user_id
            }
        )
        
        # Commit to ensure the session is saved before adding messages
        db.commit()
        
        # Now it's safe to add the message since the session exists
        self._save_message(db, session_id, "system", first_message)
        db.commit()
        
        return {"session_id": session_id, "message": first_message}

    def process_message(self, session_id: str, user_input: str, db: Session) -> Dict[str, Any]:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        
        state = self.sessions[session_id]
        current_step = state["current_step"]
        user_input_lower = user_input.lower()
        next_message = ""
        
        # Handle greeting
        if current_step == "greeting":
            # Expand the condition to match more expressions indicating illness
            if any(keyword in user_input_lower for keyword in ["not feeling well", "sick", "ill", "unwell", "start symptom", "analysis"]):
                next_message = "Would you like to start a Symptom Analysis session?"
                state["current_step"] = "start_analysis"
            else:
                next_message = "Okay, let me know if you need assistance."
        
        # Handle start analysis decision
        elif current_step == "start_analysis":
            if user_input.lower() == "yes":
                state["current_step"] = "identify_person"
                next_message = self.static_questions["identify_person"][0]
                state["asked_questions"]["identify_person"].append(next_message)
            else:
                next_message = "Alright, feel free to ask if you need help later."
        
        # Handle static question steps
        elif current_step in self.static_questions:
            last_question = state["asked_questions"][current_step][-1] if state["asked_questions"][current_step] else None
            if last_question:
                if current_step == "identify_person":
                    state["person_type"] = "self" if "myself" in user_input.lower() else "someone_else"
                    if state["person_type"] == "someone_else":
                        state["person_details"] = {"relation": user_input.split("for ")[-1]}
                elif current_step == "symptoms":
                    next_message = self._process_symptom_input(state, user_input)
                elif current_step == "care_medication":
                    # Save medication response
                    state[current_step][last_question] = user_input
                else:
                    state[current_step][last_question] = user_input
            
            remaining_questions = [q for q in self.static_questions[current_step] if q not in state["asked_questions"][current_step]]
            if remaining_questions:
                next_message = remaining_questions[0]
                state["asked_questions"][current_step].append(next_message)
            else:
                # Move to the next step in the flow
                current_index = self.steps.index(current_step)
                if current_index < len(self.steps) - 1:
                    state["current_step"] = self.steps[current_index + 1]
                    
                    # Special handling for cross_questioning
                    if state["current_step"] == "cross_questioning":
                        # Validate that we have symptoms before continuing
                        if not state["symptoms"]:
                            # No symptoms collected, ask again before proceeding
                            state["current_step"] = "symptoms"
                            next_message = "I need to know your symptoms before continuing. Please describe what you're experiencing."
                            state["asked_questions"]["symptoms"].append(next_message)
                        else:
                            try:
                                # Initialize or update the interview session
                                interview_session_id = str(hash(tuple(sorted(state["symptoms"]))))
                                state["interview_session_id"] = interview_session_id
                                
                                if interview_session_id not in self.interview_service.sessions:
                                    self.interview_service.start_interview(interview_session_id)
                                    for symptom in state["symptoms"]:
                                        self.interview_service.sessions[interview_session_id]["confirmed_symptoms"].append(symptom)
                                
                                next_message = self.interview_service.process_input(interview_session_id, "")
                            except Exception as e:
                                # Fallback if interview service fails
                                print(f"Error in cross-questioning: {str(e)}")
                                state["current_step"] = "results"
                                next_message = "Based on your symptoms, I'll prepare an assessment."
                    
                    # Special handling for results step
                    elif state["current_step"] == "results":
                        try:
                            # Generate diagnosis based on collected information
                            # Use generate_diagnosis instead of diagnose
                            diagnosis_results = self.diagnosis_service.generate_diagnosis(
                                state["symptoms"], 
                                self._extract_background_data(state)
                            )
                            next_message = self._format_diagnosis_results({"diagnosis": diagnosis_results})
                            state["diagnosis_results"] = {"diagnosis": diagnosis_results}
                            self._save_summary(db, session_id, state)
                        except Exception as e:
                            print(f"Error generating diagnosis: {str(e)}")
                            next_message = "I couldn't generate a complete assessment. Please consult a healthcare professional."
                    
                    # For other steps with static questions, get first question
                    elif state["current_step"] in self.static_questions:
                        next_message = self.static_questions[state["current_step"]][0]
                        state["asked_questions"][state["current_step"]].append(next_message)
        
        # Handle cross-questioning
        elif current_step == "cross_questioning":
            try:
                interview_session_id = state["interview_session_id"]
                next_question = self.interview_service.process_input(interview_session_id, user_input)
                session = self.interview_service.sessions[interview_session_id]
                is_complete = len(session["confirmed_symptoms"]) >= 3
                
                if is_complete:
                    state["current_step"] = "results"
                    # Update symptoms list with all confirmed symptoms from the interview
                    state["symptoms"] = session["confirmed_symptoms"]
                    # Use generate_diagnosis instead of diagnose
                    diagnosis_results = self.diagnosis_service.generate_diagnosis(
                        session["confirmed_symptoms"], 
                        self._extract_background_data(state)
                    )
                    next_message = self._format_diagnosis_results({"diagnosis": diagnosis_results})
                    state["diagnosis_results"] = {"diagnosis": diagnosis_results}
                    self._save_summary(db, session_id, state)
                else:
                    next_message = next_question
            except Exception as e:
                # Fallback if interview service throws an exception
                print(f"Error in cross-questioning: {str(e)}")
                state["current_step"] = "results" 
                next_message = "Based on the information provided, I'll prepare an assessment."
        
        # Make sure we have a next message
        if not next_message:
            next_message = "I'm not sure how to proceed. Let's try a different approach."
        
        # Save the conversation
        self._save_message(db, session_id, "user", user_input)
        self._save_message(db, session_id, "system", next_message)
        db.commit()
        
        return {"message": next_message}

    def _save_message(self, db: Session, session_id: str, sender: str, message_text: str):
        db.execute(
            text("INSERT INTO messages (session_id, sender, text, timestamp) VALUES (:id, :sender, :text, :time)"),
            {"id": session_id, "sender": sender, "text": message_text, "time": datetime.now()}
        )

    def _save_summary(self, db: Session, session_id: str, state: Dict):
        """Save session summary with proper JSON serialization"""
        # Convert numpy arrays and objects to regular Python types
        def convert_numpy(obj):
            if isinstance(obj, dict):
                return {k: convert_numpy(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy(i) for i in obj]
            elif hasattr(obj, 'item'):  # Check if it's a numpy type with .item() method
                return obj.item()        
            return obj
        
        # Convert complex objects to JSON-serializable data
        background_traits = convert_numpy(state.get("background_traits", {}))
        care_medication = convert_numpy(state.get("care_medication", {}))
        timing_intensity = convert_numpy(state.get("timing_intensity", {}))
        
        # Merge all context data into a single structure
        merged_background = {
            "background_traits": background_traits,
            "care_medication": care_medication,
            "timing_intensity": timing_intensity
        }
        
        # Handle the diagnosis results with special conversion for numpy types
        diagnosis_results = convert_numpy(state.get("diagnosis_results", {}))
        
        # For symptoms, convert to proper JSON
        symptoms_list = [str(s) for s in state.get("symptoms", [])]
        
        try:
            db.execute(
                text("INSERT INTO session_summaries (session_id, symptoms, background_traits, diagnosis_results, created_at) "
                "VALUES (:id, :symptoms, :traits, :results, :time)"),
                {
                    "id": session_id,
                    "symptoms": json.dumps(symptoms_list),  # Convert list to JSON string
                    "traits": json.dumps(merged_background),  # Convert to JSON string
                    "results": json.dumps(diagnosis_results),  # Convert to JSON string
                    "time": datetime.now()
                }
            )
            db.commit()  # Commit if successful
        except Exception as e:
            db.rollback()  # Roll back on error
            print(f"Error saving session summary: {str(e)}")
            # Continue without raising to avoid breaking the flow

        try:
            db.execute(
                text("UPDATE sessions SET status = 'completed', end_time = :time WHERE session_id = :id"),
                {"id": session_id, "time": datetime.now()}
            )
            db.commit()  # Commit if successful
        except Exception as e:
            db.rollback()  # Roll back on error
            print(f"Error saving session summary: {str(e)}")
            # Continue without raising to avoid breaking the flow

    def _format_diagnosis_results(self, diagnosis_results):
        """Format diagnosis results into a user-friendly message"""
        if not diagnosis_results or "diagnosis" not in diagnosis_results:
            return "Based on the information provided, I couldn't determine a specific condition. Please consult a healthcare professional."
        
        diseases = diagnosis_results["diagnosis"][:3]  # Show top 3
        
        message = "Based on your symptoms, possible conditions include:\n\n"
        for disease in diseases:
            conf = disease.get("confidence", 0)
            message += f"• {disease['disease']} ({conf:.1f}% confidence)\n"
        
        message += "\nPlease note: This is not a medical diagnosis. Always consult with a healthcare professional."
        return message

    def _process_symptom_input(self, state, user_input):
        """Process user input for symptoms step"""
        # Extract symptoms from free text
        input_lower = user_input.lower()
        potential_symptoms = []
        
        # Check common symptoms
        common_symptoms = ["fever", "headache", "cough", "fatigue", "pain", "nausea"]
        for symptom in common_symptoms:
            if symptom in input_lower:
                potential_symptoms.append(symptom)
        
        # Extract locations of pain
        pain_locations = ["head", "chest", "stomach", "back", "throat", "joint"]
        for location in pain_locations:
            if location in input_lower and "pain" in input_lower:
                potential_symptoms.append(f"{location} pain")
        
        # If no symptoms detected, just add the raw input
        if not potential_symptoms and user_input.strip():
            potential_symptoms.append(user_input.strip())
        
        # Add to state
        state["symptoms"].extend(potential_symptoms)
        return f"I've noted: {', '.join(potential_symptoms)}. Any other symptoms?"

    def _extract_background_data(self, state):
        """Extract structured background data from conversational input"""
        background_traits = {}
        
        # Process lifestyle questions
        for question, response in state.get("background_traits", {}).items():
            if "smoking" in question.lower() and any(word in response.lower() for word in ["yes", "smoke", "smoker"]):
                background_traits["smoking"] = "yes"
            elif "alcohol" in question.lower() and any(word in response.lower() for word in ["yes", "drink", "regularly"]):
                background_traits["alcohol"] = "yes"
            elif "travel" in question.lower() and any(word in response.lower() for word in ["yes", "recently", "abroad"]):
                background_traits["travel_history"] = "yes"
        
        # Process timing questions
        for question, response in state.get("timing_intensity", {}).items():
            if "severe" in question.lower() or "scale" in question.lower():
                # Extract numeric severity
                severity = None
                for word in response.split():
                    if word.isdigit() and 1 <= int(word) <= 10:
                        severity = int(word)
                        break
                if severity:
                    background_traits["severity"] = severity
        
        return background_traits