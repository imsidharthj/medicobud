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
            last_q = state["asked_questions"][current_step][-1] if state["asked_questions"][current_step] else None
            if last_q and current_step == "symptoms":
                # we just ran _process_symptom_input
                next_message = self._process_symptom_input(state, user_input)
                # **if we still have fewer than 3 symptoms, stay here**
                if len(state["symptoms"]) < 3:
                    state["asked_questions"]["symptoms"].append(next_message)
                    # remain on 'symptoms' step
                    return self._finalize_response(db, session_id, user_input, next_message)
                # else fall through to advance step
            # … existing per-question handlers for other steps …
            # now check remaining_questions as before
            remaining = [q for q in self.static_questions[current_step]
                         if q not in state["asked_questions"][current_step]]
            if remaining:
                next_message = remaining[0]
                state["asked_questions"][current_step].append(next_message)
            else:
                # advance to next step (timing_intensity) since we have ≥3 symptoms
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
                            # Call the main diagnose method from DiagnosisService
                            diagnosis_data = self.diagnosis_service.diagnose(
                                state["symptoms"], 
                                self._extract_background_data(state)
                            )
                            # _format_diagnosis_results in SessionService will now handle the new structure
                            next_message = self._format_diagnosis_results(diagnosis_data)
                            state["diagnosis_results"] = diagnosis_data
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
                    state["symptoms"] = session["confirmed_symptoms"]
                    # Call the main diagnose method from DiagnosisService
                    diagnosis_data = self.diagnosis_service.diagnose(
                        state["symptoms"], 
                        self._extract_background_data(state)
                    )
                    # _format_diagnosis_results in SessionService will now handle the new structure
                    next_message = self._format_diagnosis_results(diagnosis_data)
                    state["diagnosis_results"] = diagnosis_data
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

    def _format_diagnosis_results(self, diagnosis_data: Dict[str, Any]) -> str:
        primary_diagnosis = diagnosis_data.get("diagnosis", [])
        secondary_diagnosis = diagnosis_data.get("secondary_diagnosis", [])
        disclaimer = diagnosis_data.get("disclaimer", "\nPlease note: This is not a medical diagnosis. Always consult with a healthcare professional.")

        message = "Based on your symptoms, here's a preliminary assessment:\n\n"

        if primary_diagnosis:
            message += "**Primary Assessment (Local Model - Top 5):**\n"
            for d in primary_diagnosis:
                disease = d.get("disease", "Unknown Condition")
                conf = d.get("confidence", 0)
                message += f"• {disease} ({conf:.1f}% confidence)\n"
            message += "\n"
        else:
            message += "Could not determine a primary assessment from the local model at this time.\n\n"

        if secondary_diagnosis:
            message += "**Secondary Assessment (AI Refined):**\n"
            for d in secondary_diagnosis:
                disease = d.get("disease", "Unknown Condition")
                conf_text = ""
                if "confidence" in d and d["confidence"] is not None:
                    try:
                        conf_val = float(d["confidence"]) 
                        conf_text = f" (Confidence: {conf_val*100:.1f}%)"
                    except (ValueError, TypeError):
                        conf_text = f" (Confidence: {d['confidence']})"
                message += f"• {disease}{conf_text}\n"
            message += "\n"
        elif self.diagnosis_service.llm_client is not None:
             message += "AI refinement for secondary assessment was not available or did not return results.\n\n"

        message += disclaimer
        return message

    def _process_symptom_input(self, state, user_input):
        """Process user input for symptoms step, de-duplicate and require >3"""
        input_lower = user_input.lower()
        potential_symptoms = []
        common_symptoms = ["fever", "headache", "cough", "fatigue", "pain", "nausea"]
        for symptom in common_symptoms:
            if symptom in input_lower:
                potential_symptoms.append(symptom)
        pain_locations = ["head", "chest", "stomach", "back", "throat", "joint"]
        for loc in pain_locations:
            if loc in input_lower and "pain" in input_lower:
                potential_symptoms.append(f"{loc} pain")
        if not potential_symptoms and user_input.strip():
            potential_symptoms.append(user_input.strip())
        # Dedupe against already collected
        existing = set(state["symptoms"])
        new_symptoms = [s for s in potential_symptoms if s not in existing]
        if not new_symptoms:
            return "You already mentioned that. Any other symptoms?"
        state["symptoms"].extend(new_symptoms)
        return f"I've noted: {', '.join(new_symptoms)}. Any other symptoms?"

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

    def _finalize_response(self, db, session_id, user_input, next_message):
        """Save both user & system messages, commit, then return."""
        self._save_message(db, session_id, "user", user_input)
        self._save_message(db, session_id, "system", next_message)
        db.commit()
        return {"message": next_message}