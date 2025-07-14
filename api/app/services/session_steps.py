from typing import Dict, Any
from datetime import datetime
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class DiagnosisStep(Enum):
    GREETING = "greeting"
    SYMPTOM_ANALYSIS_CONFIRMATION = "symptom_analysis_confirmation"
    BACKGROUND_TRAITS = "background_traits"
    SUBSTANCES = "substances"
    TRAVELED = "traveled"
    SYMPTOMS = "symptoms"
    SYMPTOM_ONSET = "symptom_onset"
    PAIN_SEVERITY = "pain_severity"
    TEMPERATURE = "temperature"
    CARE_MEDICATION = "care_medication"
    CROSS_QUESTIONING = "cross_questioning"
    DIAGNOSIS = "diagnosis"
    RESULTS = "results"

class SessionStepController:
    def __init__(self, interview_service, diagnosis_service):
        self.interview_service = interview_service
        self.diagnosis_service = diagnosis_service
        self.pain_keywords = ["pain", "headache", "ache", "cramp", "discomfort", "sore"]

    def get_initial_step(self) -> Dict[str, Any]:
        return self._get_step_payload(DiagnosisStep.GREETING, {})

    def process_message(self, session_state: Dict[str, Any], step: str, data: Dict[str, Any]) -> Dict[str, Any]:
        session_state[step] = data
        if "completed_steps" not in session_state:
            session_state["completed_steps"] = []
        session_state["completed_steps"].append(step)
        session_state["last_updated"] = datetime.now().isoformat()

        next_step_enum = self._determine_next_step(session_state, step)
        return self._get_step_payload(next_step_enum, session_state)

    def _determine_next_step(self, session_state: Dict[str, Any], current_step_str: str) -> DiagnosisStep:
        if current_step_str == DiagnosisStep.CROSS_QUESTIONING.value:
            count = session_state.get("cross_questioning_count", 0)
            if count >= 2:
                return DiagnosisStep.DIAGNOSIS
            else:
                return DiagnosisStep.CROSS_QUESTIONING

        data = session_state.get(current_step_str, {})
        
        step_map = {
            DiagnosisStep.GREETING.value: DiagnosisStep.SYMPTOM_ANALYSIS_CONFIRMATION,
            DiagnosisStep.SYMPTOM_ANALYSIS_CONFIRMATION.value: DiagnosisStep.BACKGROUND_TRAITS if data.get("wants_analysis", True) else DiagnosisStep.RESULTS,
            DiagnosisStep.BACKGROUND_TRAITS.value: DiagnosisStep.SUBSTANCES,
            DiagnosisStep.SUBSTANCES.value: DiagnosisStep.TRAVELED,
            DiagnosisStep.TRAVELED.value: DiagnosisStep.SYMPTOMS,
            DiagnosisStep.SYMPTOMS.value: DiagnosisStep.SYMPTOM_ONSET,
            DiagnosisStep.SYMPTOM_ONSET.value: self._get_next_step_after_onset(session_state),
            DiagnosisStep.PAIN_SEVERITY.value: DiagnosisStep.TEMPERATURE,
            DiagnosisStep.TEMPERATURE.value: DiagnosisStep.CARE_MEDICATION,
            DiagnosisStep.CARE_MEDICATION.value: DiagnosisStep.CROSS_QUESTIONING,
        }
        return step_map.get(current_step_str, DiagnosisStep.DIAGNOSIS)

    def _get_next_step_after_onset(self, session_state: Dict[str, Any]) -> DiagnosisStep:
        symptoms = session_state.get("symptoms", {}).get("symptoms", [])
        if any(keyword in s.lower() for s in symptoms for keyword in self.pain_keywords):
            return DiagnosisStep.PAIN_SEVERITY
        return DiagnosisStep.TEMPERATURE

    def _get_step_payload(self, step: DiagnosisStep, session_state: Dict[str, Any]) -> Dict[str, Any]:
        handlers = {
            DiagnosisStep.GREETING: self._handle_greeting,
            DiagnosisStep.SYMPTOM_ANALYSIS_CONFIRMATION: self._handle_symptom_analysis_confirmation,
            DiagnosisStep.BACKGROUND_TRAITS: self._handle_background_traits,
            DiagnosisStep.SUBSTANCES: self._handle_substances,
            DiagnosisStep.TRAVELED: self._handle_traveled,
            DiagnosisStep.SYMPTOMS: self._handle_symptoms,
            DiagnosisStep.SYMPTOM_ONSET: self._handle_symptom_onset,
            DiagnosisStep.PAIN_SEVERITY: self._handle_pain_severity,
            DiagnosisStep.TEMPERATURE: self._handle_temperature,
            DiagnosisStep.CARE_MEDICATION: self._handle_care_medication,
            DiagnosisStep.CROSS_QUESTIONING: self._handle_cross_questioning,
            DiagnosisStep.DIAGNOSIS: self._handle_diagnosis,
            DiagnosisStep.RESULTS: self._handle_results,
        }
        handler = handlers.get(step, self._handle_results)
        return handler(session_state)

    def _handle_greeting(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "How are you feeling today?", "next_step": DiagnosisStep.GREETING.value}

    def _handle_symptom_analysis_confirmation(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Would you like to start a Symptom Analysis session?", "next_step": DiagnosisStep.SYMPTOM_ANALYSIS_CONFIRMATION.value}

    def _handle_background_traits(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Are you answering these questions for yourself or someone else?", "next_step": DiagnosisStep.BACKGROUND_TRAITS.value}

    def _handle_substances(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Have you used any substances like smoking, alcohol, or recreational drugs?", "next_step": DiagnosisStep.SUBSTANCES.value}

    def _handle_traveled(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Have you traveled recently or been to any new places?", "next_step": DiagnosisStep.TRAVELED.value}

    def _handle_symptoms(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Please describe the symptoms you're currently experiencing.", "next_step": DiagnosisStep.SYMPTOMS.value}

    def _handle_symptom_onset(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "When did your symptoms start?", "next_step": DiagnosisStep.SYMPTOM_ONSET.value}

    def _handle_pain_severity(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "On a scale of 1 to 10, how severe is your pain or discomfort?", "next_step": DiagnosisStep.PAIN_SEVERITY.value}

    def _handle_temperature(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Do you have a fever or know your current body temperature?", "next_step": DiagnosisStep.TEMPERATURE.value}

    def _handle_care_medication(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Have you visited a doctor recently or are you currently taking any medication?", "next_step": DiagnosisStep.CARE_MEDICATION.value}

    def _handle_cross_questioning(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        session_id = session_state.get("session_id")
        count = session_state.get("cross_questioning_count", 0)
        session_state["cross_questioning_count"] = count + 1

        symptoms = session_state.get("symptoms", {}).get("symptoms", [])
        confirmed_symptoms = set(symptoms)
        
        if "temperature" in session_state and session_state["temperature"].get("fever_level") == "normal":
            confirmed_symptoms.add("fever")

        try:
            if count == 0:
                question = self.interview_service.start_interview(session_id, list(confirmed_symptoms))
            else:
                last_response = session_state.get(DiagnosisStep.CROSS_QUESTIONING.value, {}).get("response", "")
                question = self.interview_service.process_input(session_id, last_response)
            
            is_complete = "Based on your symptoms" in question or "Could not determine" in question
            
            if is_complete:
                return self._handle_diagnosis(session_state)

            return {
                "success": True,
                "message": question,
                "next_step": DiagnosisStep.CROSS_QUESTIONING.value,
            }
        except Exception as e:
            logger.error(f"Error during cross-questioning: {e}")
            return self._handle_diagnosis(session_state)

    def _handle_diagnosis(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        symptoms = session_state.get("symptoms", {}).get("symptoms", [])
        
        interview_state = self.interview_service.sessions.get(session_state.get("session_id"), {})
        if interview_state.get("confirmed_symptoms"):
            symptoms.extend(interview_state["confirmed_symptoms"])
        
        background_data = self._extract_background_data(session_state)
        
        diagnosis_data = self.diagnosis_service.diagnose(list(set(symptoms)), background_data)
        
        return {
            "success": True,
            "message": "Analysis complete. Here are your results:",
            "next_step": DiagnosisStep.RESULTS.value,
            "diagnosis_data": diagnosis_data,
            "session_complete": True
        }

    def _handle_results(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Session ended.", "next_step": DiagnosisStep.RESULTS.value, "session_complete": True}

    def _extract_background_data(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        background_data = {}
        steps_to_include = [
            "background_traits", "substances", "traveled", 
            "symptom_onset", "pain_severity", "temperature", "care_medication"
        ]
        for step in steps_to_include:
            if step in session_state:
                background_data.update(session_state[step])
        return background_data