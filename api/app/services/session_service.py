from typing import Dict, Any, Optional
from app.services.interview_service import InterviewService
from app.services.diagnosis_service import DiagnosisService
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import uuid4
import json
from app.utils import unique_symptoms, load_default_disease_data
from thefuzz import process as fuzzy_process
from fuzzywuzzy import fuzz
from app.temp.temp_user import temp_user_manager, FeatureType
from fastapi import Request

class SessionService:
    def __init__(self, interview_service: InterviewService, diagnosis_service: DiagnosisService):
        self.interview_service = interview_service
        self.diagnosis_service = diagnosis_service
        self.sessions = {}
        self.steps = [
            "greeting", "start_analysis", "identify_person", "background_traits",
            "symptoms", "timing_intensity", "care_medication", "cross_questioning", "results"
        ]
        self.static_questions = {
            "identify_person": ["Are you answering these questions for yourself or someone else?"],
            "background_traits": [
                "Have you used any substances recently, such as smoking, alcohol, or opioids?",
                "Have you recently traveled long-distance or are you currently taking any medications?"
            ],
            "symptoms": ["Please describe the symptoms you're currently experiencing."],
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

        if not unique_symptoms:
            load_default_disease_data()

    def start_session(self, db: Session, email: str = None, user_id: str = None, 
                     is_temp_user: bool = False, request: Request = None) -> Dict[str, Any]:
        
        if (is_temp_user or 
            (email and 'guest@medicobud.temp' in email) or 
            (user_id and temp_user_manager.is_temp_user(user_id)) or
            (not email and not user_id)):
            
            if not user_id and request:
                user_id = temp_user_manager.create_temp_user_from_request(request)
            elif not user_id:
                user_id = temp_user_manager.create_anonymous_temp_user()
            
            try:
                access_info = temp_user_manager.check_feature_access(user_id, FeatureType.DIAGNOSIS)
                session_id = temp_user_manager.create_feature_session(
                    user_id, 
                    FeatureType.DIAGNOSIS,
                    {"step": "greeting", "symptoms": []}
                )
                
                stats = temp_user_manager.get_temp_user_stats(user_id)
                
            except Exception as e:
                return {
                    "error": str(e), 
                    "temp_user_id": user_id,
                    "remaining_daily": 0
                }
            
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
                "asked_questions": {step: [] for step in self.static_questions},
                "is_temporary": True,
                "user_id": user_id
            }
            
            first_message = "How are you feeling today?"
            temp_user_manager.add_message_to_temp_session(session_id, "system", first_message)
            
            return {
                "session_id": session_id, 
                "message": first_message, 
                "temp_user_id": user_id,
                "remaining_daily": stats.get("remaining_limits", {}).get("diagnosis", {}).get("daily_remaining", 0),
                "is_temporary": True
            }
        
        if email:
            try:
                user_exists = db.execute(
                    text("SELECT email FROM user_profiles WHERE email = :email LIMIT 1"),
                    {"email": email}
                ).fetchone()
                
                if not user_exists:
                    return self.start_session(db, email=None, user_id=None, is_temp_user=True)
                    
            except Exception:
                return self.start_session(db, email=None, user_id=None, is_temp_user=True)
        
        if not email and not user_id:
            return self.start_session(db, email=None, user_id=None, is_temp_user=True, request=request)
        
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
            "asked_questions": {step: [] for step in self.static_questions},
            "is_temporary": False
        }
        first_message = "How are you feeling today?"
        
        try:
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
            
            db.commit()
            self._save_message(db, session_id, "system", first_message)
            db.commit()
        except Exception:
            db.rollback()
            return self.start_session(db, email=None, user_id=None, is_temp_user=True)
        
        return {"session_id": session_id, "message": first_message}

    def process_message(self, session_id: str, user_input: str, db: Session) -> Dict[str, Any]:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        
        state = self.sessions[session_id]
        current_step = state["current_step"]
        user_input_lower = user_input.lower()
        next_message = ""
        is_temporary = state.get("is_temporary", False)
        
        if current_step == "greeting":
            if any(keyword in user_input_lower for keyword in ["not feeling well", "sick", "ill", "unwell", "start symptom", "analysis"]):
                next_message = "Would you like to start a Symptom Analysis session?"
                state["current_step"] = "start_analysis"
            else:
                next_message = "Okay, let me know if you need assistance."
        
        elif current_step == "start_analysis":
            if user_input.lower() == "yes":
                state["current_step"] = "identify_person"
                next_message = self.static_questions["identify_person"][0]
                state["asked_questions"]["identify_person"].append(next_message)
            else:
                next_message = "Alright, feel free to ask if you need help later."
        
        elif current_step in self.static_questions:
            last_q = state["asked_questions"][current_step][-1] if state["asked_questions"][current_step] else None
            if last_q and current_step == "symptoms":
                next_message = self._process_symptom_input(state, user_input)
                if len(state["symptoms"]) < 3:
                    state["asked_questions"]["symptoms"].append(next_message)
                    return self._finalize_response(db, session_id, user_input, next_message, is_temporary)

            remaining = [q for q in self.static_questions[current_step]
                         if q not in state["asked_questions"][current_step]]
            if remaining:
                next_message = remaining[0]
                state["asked_questions"][current_step].append(next_message)
            else:
                current_index = self.steps.index(current_step)
                if current_index < len(self.steps) - 1:
                    state["current_step"] = self.steps[current_index + 1]
                    
                    if state["current_step"] == "cross_questioning":
                        if not state["symptoms"]:
                            state["current_step"] = "symptoms"
                            next_message = "I need to know your symptoms before continuing. Please describe what you're experiencing."
                            state["asked_questions"]["symptoms"].append(next_message)
                        else:
                            try:
                                interview_session_id = str(hash(tuple(sorted(state["symptoms"]))))
                                state["interview_session_id"] = interview_session_id
                                
                                if interview_session_id not in self.interview_service.sessions:
                                    normalized_symptoms = [str(s).strip().lower() for s in state["symptoms"]]
                                    self.interview_service.start_interview(
                                        interview_session_id, 
                                        initial_confirmed_symptoms=normalized_symptoms
                                    )
                                
                                next_message = self.interview_service.process_input(interview_session_id, "")
                            except Exception as e:
                                state["current_step"] = "results"
                                next_message = "Based on your symptoms, I'll prepare an assessment."
                    
                    elif state["current_step"] == "results":
                        try:
                            diagnosis_data = self.diagnosis_service.diagnose(
                                state["symptoms"], 
                                self._extract_background_data(state)
                            )
                            next_message = self._format_diagnosis_results(diagnosis_data)
                            state["diagnosis_results"] = diagnosis_data
                            self._save_summary(db, session_id, state, is_temporary)
                        except Exception as e:
                            next_message = "I couldn't generate a complete assessment. Please consult a healthcare professional."
                    
                    elif state["current_step"] in self.static_questions:
                        next_message = self.static_questions[state["current_step"]][0]
                        state["asked_questions"][state["current_step"]].append(next_message)

        elif current_step == "cross_questioning":
            try:
                interview_session_id = state["interview_session_id"]
                next_question = self.interview_service.process_input(interview_session_id, user_input)
                session = self.interview_service.sessions[interview_session_id]
                is_complete = len(session["confirmed_symptoms"]) >= 3
                
                if is_complete:
                    state["current_step"] = "results"
                    state["symptoms"] = session["confirmed_symptoms"]
                    diagnosis_data = self.diagnosis_service.diagnose(
                        state["symptoms"], 
                        self._extract_background_data(state)
                    )
                    next_message = self._format_diagnosis_results(diagnosis_data)
                    state["diagnosis_results"] = diagnosis_data
                    self._save_summary(db, session_id, state, is_temporary)
                else:
                    next_message = next_question
            except Exception as e:
                state["current_step"] = "results" 
                next_message = "Based on the information provided, I'll prepare an assessment."
        
        if not next_message:
            next_message = "I'm not sure how to proceed. Let's try a different approach."
        
        return self._finalize_response(db, session_id, user_input, next_message, is_temporary)

    def _save_message(self, db: Session, session_id: str, sender: str, message_text: str):
        db.execute(
            text("INSERT INTO messages (session_id, sender, text, timestamp) VALUES (:id, :sender, :text, :time)"),
            {"id": session_id, "sender": sender, "text": message_text, "time": datetime.now()}
        )

    def _save_summary(self, db: Session, session_id: str, state: Dict, is_temporary: bool = False):
        if is_temporary:
            # For temporary sessions, update in-memory data
            summary_data = {
                "symptoms": state.get("symptoms", []),
                "background_traits": state.get("background_traits", {}),
                "diagnosis_results": state.get("diagnosis_results", {}),
                "status": "completed"
            }
            temp_user_manager.update_temp_session(session_id, summary_data)
            return

        # Existing logic for regular users
        def convert_numpy(obj):
            if isinstance(obj, dict):
                return {k: convert_numpy(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy(i) for i in obj]
            elif hasattr(obj, 'item'):
                return obj.item()        
            return obj

        background_traits = convert_numpy(state.get("background_traits", {}))
        care_medication = convert_numpy(state.get("care_medication", {}))
        timing_intensity = convert_numpy(state.get("timing_intensity", {}))
        
        merged_background = {
            "background_traits": background_traits,
            "care_medication": care_medication,
            "timing_intensity": timing_intensity
        }
        
        diagnosis_results = convert_numpy(state.get("diagnosis_results", {}))
        symptoms_list = [str(s) for s in state.get("symptoms", [])]
        
        try:
            db.execute(
                text("INSERT INTO session_summaries (session_id, symptoms, background_traits, diagnosis_results, created_at) "
                "VALUES (:id, :symptoms, :traits, :results, :time)"),
                {
                    "id": session_id,
                    "symptoms": json.dumps(symptoms_list),
                    "traits": json.dumps(merged_background),
                    "results": json.dumps(diagnosis_results),
                    "time": datetime.now()
                }
            )
            db.commit()
        except Exception:
            db.rollback()

        try:
            db.execute(
                text("UPDATE sessions SET status = 'completed', end_time = :time WHERE session_id = :id"),
                {"id": session_id, "time": datetime.now()}
            )
            db.commit()
        except Exception:
            db.rollback()

    def _format_diagnosis_results(self, diagnosis_data: Dict[str, Any]) -> str:
        primary_diagnosis = diagnosis_data.get("diagnosis", [])
        secondary_diagnosis = diagnosis_data.get("secondary_diagnosis", [])

        message = "🩺 **MEDICAL ASSESSMENT RESULTS**\n\n"

        if secondary_diagnosis:
            message += "📋 **PRIMARY ASSESSMENT (AI-Enhanced Analysis):**\n"
            for i, d in enumerate(secondary_diagnosis, 1):
                disease = d.get("disease", "Unknown Condition")
                conf_text = ""
                if "confidence" in d and d["confidence"] is not None:
                    try:
                        conf_val = float(d["confidence"]) 
                        conf_text = f" - {conf_val*100:.1f}% confidence"
                    except (ValueError, TypeError):
                        conf_text = f" - {d['confidence']} confidence"
                message += f"   {i}. **{disease}**{conf_text}\n"
            message += "\n"
        elif self.diagnosis_service.llm_client is not None:
            message += "📋 **PRIMARY ASSESSMENT (AI-Enhanced Analysis):**\n"
            message += "   ⚠️ AI refinement temporarily unavailable\n\n"

        if primary_diagnosis:
            message += "🔬 **SECONDARY ASSESSMENT (Statistical Model - Top 5):**\n"
            for i, d in enumerate(primary_diagnosis, 1):
                disease = d.get("disease", "Unknown Condition")
                conf = d.get("confidence", 0)
                severity = d.get("severity", "unknown")
                coverage = d.get("symptom_coverage", 0)
                
                severity_icon = "🔴" if severity == "high" else "🟡" if severity == "medium" else "🟢"
                message += f"   {i}. **{disease}** - {conf:.1f}% confidence {severity_icon}\n"
                message += f"      └ Symptom match: {coverage}% | Severity: {severity.title()}\n"
            message += "\n"
        else:
            message += "🔬 **SECONDARY ASSESSMENT (Statistical Model):**\n"
            message += "   ⚠️ Could not determine assessment from statistical model\n\n"

        if hasattr(self, 'sessions') and self.sessions:
            current_session = list(self.sessions.values())[-1] if self.sessions else {}
            symptoms = current_session.get("symptoms", [])
            if symptoms:
                message += f"📝 **REPORTED SYMPTOMS:** {', '.join(symptoms[:5])}"
                if len(symptoms) > 5:
                    message += f" and {len(symptoms) - 5} more"
                message += "\n\n"

        message += "⚠️ **IMPORTANT MEDICAL DISCLAIMER:**\n"
        message += "This assessment is AI-generated for informational purposes only.\n"
        message += "• NOT a substitute for professional medical advice\n"
        message += "• Consult a qualified healthcare provider for proper diagnosis\n"
        message += "• Seek immediate medical attention for severe or emergency symptoms\n"
        
        return message

    def _process_symptom_input(self, state, user_input):
        input_lower = user_input.lower().strip()
        potential_symptoms = []
        
        phrases = [phrase.strip() for phrase in input_lower.replace(",", " and ").split("and") if phrase.strip()]
        if not phrases and input_lower:
            phrases = [input_lower]
        
        symptom_mappings = {
            "fever": "fever",
            "headache": "headache", 
            "head ache": "headache",
            "cough": "cough",
            "fatigue": "fatigue",
            "tired": "fatigue",
            "exhausted": "fatigue",
            "nausea": "nausea",
            "vomiting": "vomiting",
            "throw up": "vomiting",
        }
        
        for phrase in phrases:
            matched = False
            for term, normalized in symptom_mappings.items():
                if term == phrase:
                    potential_symptoms.append(normalized)
                    matched = True
                    break
                elif term in phrase:
                    potential_symptoms.append(normalized)
                    matched = True
            
            if not matched and phrase:
                best_match = None
                best_score = 0
                
                for symptom in unique_symptoms:
                    score = fuzz.ratio(phrase, symptom)
                    if score > best_score and score >= 85:
                        best_score = score
                        best_match = symptom
                
                if best_match:
                    potential_symptoms.append(best_match)
        
        if "pain" in input_lower or "ache" in input_lower or "hurt" in input_lower:
            pain_locations = {
                "head": "headache",
                "chest": "chest_pain", 
                "stomach": "stomach_pain",
                "abdomen": "abdominal_pain",
                "back": "back_pain",
                "throat": "throat_irritation",
                "joint": "joint_pain",
                "muscle": "muscle_pain",
                "neck": "neck_pain",
                "knee": "knee_pain",
                "hip": "hip_joint_pain"
            }
            
            for loc, pain_symptom in pain_locations.items():
                if loc in input_lower:
                    potential_symptoms.append(pain_symptom)
        
        existing = set(state["symptoms"])
        new_symptoms = []
        for symptom in potential_symptoms:
            if symptom not in existing and symptom not in new_symptoms:
                new_symptoms.append(symptom)
        
        if not new_symptoms:
            if potential_symptoms:
                return "You already mentioned that. Any other symptoms?"
            return "I didn't recognize any symptoms. Could you please describe them differently?"
        
        state["symptoms"].extend(new_symptoms)
        return f"I've noted: {', '.join(new_symptoms)}. Any other symptoms?"

    def _extract_background_data(self, state):
        background_traits = {}
        
        for question, response in state.get("background_traits", {}).items():
            if "smoking" in question.lower() and any(word in response.lower() for word in ["yes", "smoke", "smoker"]):
                background_traits["smoking"] = "yes"
            elif "alcohol" in question.lower() and any(word in response.lower() for word in ["yes", "drink", "regularly"]):
                background_traits["alcohol"] = "yes"
            elif "travel" in question.lower() and any(word in response.lower() for word in ["yes", "recently", "abroad"]):
                background_traits["travel_history"] = "yes"
        
        for question, response in state.get("timing_intensity", {}).items():
            if "severe" in question.lower() or "scale" in question.lower():
                severity = None
                for word in response.split():
                    if word.isdigit() and 1 <= int(word) <= 10:
                        severity = int(word)
                        break
                if severity:
                    background_traits["severity"] = severity
        
        return background_traits

    def _finalize_response(self, db, session_id, user_input, next_message, is_temporary=False):
        if is_temporary:
            # For temporary sessions, save messages to memory
            temp_user_manager.add_message_to_temp_session(session_id, "user", user_input)
            temp_user_manager.add_message_to_temp_session(session_id, "system", next_message)
        else:
            # For regular sessions, save to database
            self._save_message(db, session_id, "user", user_input)
            self._save_message(db, session_id, "system", next_message)
            db.commit()
        
        return {"message": next_message}