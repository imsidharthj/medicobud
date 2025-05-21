import os
import json
import google.generativeai as genai  # Import Google's SDK
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MultiLabelBinarizer
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from collections import defaultdict

class DiagnosisService:
    def __init__(self, dataset_path: str = "dataset.csv", weights_path: str = "data/symptom_weights.csv"):
        self.classifier = CalibratedClassifierCV(LogisticRegression(max_iter=1000, class_weight='balanced'))
        self.mlb = MultiLabelBinarizer()
        self.dataset_path = dataset_path
        self.weights_path = weights_path
        self.symptom_weights = self.load_symptom_weights()
        self.disease_symptom_map = defaultdict(set)

        # init LLM client for secondary refinement using Google Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in environment. LLM refinement will be skipped.")
            self.llm_client = None
        else:
            try:
                genai.configure(api_key=api_key)
                self.llm_client = genai.GenerativeModel('gemini-1.5-flash')
                print("Successfully configured Gemini Pro client.")
            except Exception as e:
                print(f"Error configuring Gemini client: {e}")
                self.llm_client = None

        self.load_and_train_model()

    def load_symptom_weights(self) -> Dict[str, float]:
        """Load symptom weights with validation"""
        if os.path.exists(self.weights_path):
            df = pd.read_csv(self.weights_path)
            return dict(zip(df['symptom'], df['weight'].clip(lower=0.5, upper=3.0)))
        return self._create_default_weights()

    def _create_default_weights(self) -> Dict[str, float]:
        """Create weights with basic frequency analysis"""
        df = pd.read_csv(self.dataset_path)
        symptom_freq = defaultdict(int)
        if "symptoms" in df.columns:
            for symptoms in df['symptoms'].str.split(','):
                for symptom in symptoms:
                    symptom_freq[symptom.strip()] += 1
        else:
            symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
            for col in symptom_cols:
                for symptom in df[col].dropna():
                    symptom_freq[symptom.strip()] += 1
        max_freq = max(symptom_freq.values()) if symptom_freq else 1
        return {symptom: (count/max_freq)*2 + 0.5 for symptom, count in symptom_freq.items()}

    def load_and_train_model(self):
        """Improved data loading and model training"""
        df = pd.read_csv(self.dataset_path).drop_duplicates().fillna('')
        symptoms_list, diseases = [], []
        if "symptoms" in df.columns:
            for _, row in df.iterrows():
                symptoms = [s.strip() for s in row['symptoms'].split(',')]
                symptoms_list.append(symptoms)
                diseases.append(row['Disease'])
                self.disease_symptom_map[row['Disease']].update(symptoms)
        else:
            symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
            for _, row in df.iterrows():
                symptoms = [str(row[col]).strip() for col in symptom_cols if pd.notna(row[col])]
                symptoms_list.append(symptoms)
                diseases.append(row['Disease'])
                self.disease_symptom_map[row['Disease']].update(symptoms)
        X = self.mlb.fit_transform(symptoms_list)
        weights_array = np.array([self.symptom_weights.get(s, 1.0) for s in self.mlb.classes_])
        X_weighted = X * weights_array
        self.classifier.fit(X_weighted, diseases)

    def generate_diagnosis(self, symptoms: List[str], background: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Enhanced diagnosis generation with weighted symptoms and extended background"""
        if not symptoms:
            return []

        valid_symptoms = [s for s in symptoms if isinstance(s, str) and s.strip()]
        if not valid_symptoms:
            return []

        try:
            X_input = self.mlb.transform([valid_symptoms])
        except ValueError:
            known_symptoms_for_input = [s for s in valid_symptoms if s in self.mlb.classes_]
            if not known_symptoms_for_input:
                return []
            X_input = self.mlb.transform([known_symptoms_for_input])

        weights_array = np.array([self.symptom_weights.get(s, 1.0) for s in self.mlb.classes_])
        X_weighted = X_input * weights_array

        if X_weighted.shape[1] == 0:
            return []

        probabilities = self.classifier.predict_proba(X_weighted)[0]
        probabilities = self.apply_clinical_adjustments(probabilities, valid_symptoms, background or {})

        results: List[Dict[str, Any]] = []
        seen = set()
        for prob, disease in sorted(zip(probabilities, self.classifier.classes_), reverse=True):
            pct = round(prob * 100, 1)
            if pct < 1.0 or disease in seen:
                continue
            seen.add(disease)
            ds = self.disease_symptom_map.get(disease, set())
            matched = len(ds & set(valid_symptoms))
            coverage = round(matched / len(ds) * 100) if ds else 0

            current_result = {
                "disease": disease,
                "confidence": pct,
                "symptom_coverage": coverage,
                "severity": self.get_disease_severity(disease, background or {}),
                "key_symptoms": list(ds & set(valid_symptoms))
            }

            explanations = []
            for symptom in current_result["key_symptoms"]:
                weight = self.symptom_weights.get(symptom, 1.0)
                explanations.append(f"{symptom} is present" + (f" (strong indicator, weight: {weight:.1f}x)" if weight > 1.2 else ""))

            if background:
                if 'age' in background and background.get('age', 0) > 60 and disease in ["Hypertension", "Diabetes"]:
                    explanations.append(f"Age ({background['age']}) increases risk for {disease}")

            current_result["explanations"] = explanations
            results.append(current_result)

        return results[:5]

    def _llm_refine_diagnosis(self, symptoms: List[str], top_diseases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Use Google Gemini to produce a secondary refined diagnosis list (max 5)."""
        if not self.llm_client or not symptoms:
            print("LLM client not available or no symptoms provided for refinement.")
            return []

        prompt = (
            f"A user reports the following symptoms: {', '.join(symptoms)}.\n"
            "Based on these symptoms, provide a list of up to 5 most likely medical conditions. "
            "Return the response strictly as a JSON array of objects, where each object has a 'disease' (string) key "
            "and an optional 'confidence' (float between 0.0 and 1.0) key. For example: "
            '[{"disease": "Common Cold", "confidence": 0.8}, {"disease": "Flu"}]. Ensure the output is only the JSON array.'
        )
        try:
            print(f"Sending prompt to Gemini: {prompt}")
            response = self.llm_client.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3
                )
            )
            
            text_content = response.text
            print(f"Raw response from Gemini: {text_content}")

            if text_content.strip().startswith("```json"):
                text_content = text_content.strip()[7:-3].strip()
            elif text_content.strip().startswith("```"):
                text_content = text_content.strip()[3:-3].strip()
            
            try:
                data = json.loads(text_content)
                if isinstance(data, list):
                    return data[:5]
                elif isinstance(data, dict):
                    for key_data in data.values():
                        if isinstance(key_data, list):
                            return key_data[:5]
                print(f"Parsed JSON from Gemini but it was not a list or expected dict: {data}")
                return []
            except json.JSONDecodeError as e:
                print(f"LLM response was not valid JSON after attempting to clean: {text_content}. Error: {e}")
                return []
        except Exception as e:
            print(f"Error calling Google Gemini API for refinement: {e}")
            return []

    def apply_clinical_adjustments(self, probabilities, symptoms: List[str], background: Dict[str, Any]) -> np.ndarray:
        """Evidence-based probability adjustments with extended session data"""
        adjustments = {
            'age': {
                'conditions': [(70, 1.2), (40, 1.0), (18, 0.9)],
                'diseases': ['Hypertension', 'Diabetes', 'Dementia']
            },
            'gender': {
                'F': {'Endometriosis': 1.5, 'Prostate Cancer': 0.01},
                'M': {'Prostate Cancer': 1.5, 'Ovarian Cancer': 0.01}
            },
            'background_traits': {
                'smoking': {
                    'conditions': {'yes': 1.3, 'no': 0.9},
                    'diseases': ['Bronchial Asthma', 'Lung Cancer', 'COPD']
                },
                'alcohol': {
                    'conditions': {'yes': 1.2, 'no': 0.95},
                    'diseases': ['Alcoholic hepatitis', 'Cirrhosis']
                },
                'travel_history': {
                    'conditions': {'yes': 1.4, 'no': 0.9},
                    'diseases': ['Malaria', 'Dengue', 'Typhoid']
                },
                'medications': {
                    'conditions': {'any': 1.1},
                    'diseases': ['Drug-induced hepatitis']
                }
            },
            'timing_intensity': {
                'severity': {
                    'conditions': {'>7': 1.3, '4-7': 1.0, '<4': 0.8},
                    'diseases': ['Pneumonia', 'Heart attack', 'Tuberculosis']
                },
                'duration': {
                    'conditions': {'>14 days': 1.2, '7-14 days': 1.0, '<7 days': 0.9},
                    'diseases': ['Tuberculosis', 'Chronic cholestasis']
                }
            },
            'care_medication': {
                'doctor_visit': {
                    'conditions': {'yes': 1.1, 'no': 0.9},
                    'diseases': ['Pneumonia', 'Tuberculosis']
                },
                'medication_use': {
                    'conditions': {'yes': 1.1, 'no': 0.95},
                    'diseases': ['Drug-induced hepatitis']
                }
            }
        }

        if 'age' in background:
            age = background['age']
            for max_age, factor in adjustments['age']['conditions']:
                if age > max_age:
                    for disease in adjustments['age']['diseases']:
                        if disease in self.classifier.classes_:
                            idx = list(self.classifier.classes_).index(disease)
                            probabilities[idx] *= factor
                    break

        if 'gender' in background:
            gender = background['gender'].upper()
            for disease, factor in adjustments['gender'].get(gender, {}).items():
                if disease in self.classifier.classes_:
                    idx = list(self.classifier.classes_).index(disease)
                    probabilities[idx] *= factor

        if 'background_traits' in background:
            traits = background['background_traits']
            for trait, config in adjustments['background_traits'].items():
                if trait in traits:
                    value = traits.get(trait, '').lower()
                    for condition, factor in config['conditions'].items():
                        if condition == 'any' or value == condition:
                            for disease in config['diseases']:
                                if disease in self.classifier.classes_:
                                    idx = list(self.classifier.classes_).index(disease)
                                    probabilities[idx] *= factor

        if 'timing_intensity' in background:
            timing = background['timing_intensity']
            if 'severity' in timing:
                severity = float(timing['severity']) if timing['severity'].isdigit() else 0
                for threshold, factor in adjustments['timing_intensity']['severity']['conditions'].items():
                    if isinstance(threshold, str) and threshold.startswith('>'):
                        if severity > int(threshold[1:]):
                            for disease in adjustments['timing_intensity']['severity']['diseases']:
                                if disease in self.classifier.classes_:
                                    idx = list(self.classifier.classes_).index(disease)
                                    probabilities[idx] *= factor
                    elif isinstance(threshold, str) and threshold.startswith('<'):
                        if severity < int(threshold[1:]):
                            for disease in adjustments['timing_intensity']['severity']['diseases']:
                                if disease in self.classifier.classes_:
                                    idx = list(self.classifier.classes_).index(disease)
                                    probabilities[idx] *= factor
                    else:
                        low, high = map(int, threshold.split('-'))
                        if low <= severity <= high:
                            for disease in adjustments['timing_intensity']['severity']['diseases']:
                                if disease in self.classifier.classes_:
                                    idx = list(self.classifier.classes_).index(disease)
                                    probabilities[idx] *= factor
            if 'duration' in timing:
                duration = timing['duration'].lower()
                for condition, factor in adjustments['timing_intensity']['duration']['conditions'].items():
                    if (condition.startswith('>') and 'days' in duration and int(duration.split()[0]) > int(condition[1:].split()[0])) or \
                       (condition.startswith('<') and 'days' in duration and int(duration.split()[0]) < int(condition[1:].split()[0])) or \
                       ('-' in condition and 'days' in duration and int(condition.split('-')[0]) <= int(duration.split()[0]) <= int(condition.split('-')[1].split()[0])):
                        for disease in adjustments['timing_intensity']['duration']['diseases']:
                            if disease in self.classifier.classes_:
                                idx = list(self.classifier.classes_).index(disease)
                                probabilities[idx] *= factor

        if 'care_medication' in background:
            care = background['care_medication']
            if 'doctor_visit' in care:
                value = care['doctor_visit'].lower()
                for condition, factor in adjustments['care_medication']['doctor_visit']['conditions'].items():
                    if value == condition:
                        for disease in adjustments['care_medication']['doctor_visit']['diseases']:
                            if disease in self.classifier.classes_:
                                idx = list(self.classifier.classes_).index(disease)
                                probabilities[idx] *= factor
            if 'medication_use' in care:
                value = care['medication_use'].lower()
                for condition, factor in adjustments['care_medication']['medication_use']['conditions'].items():
                    if value == condition:
                        for disease in adjustments['care_medication']['medication_use']['diseases']:
                            if disease in self.classifier.classes_:
                                idx = list(self.classifier.classes_).index(disease)
                                probabilities[idx] *= factor

        probabilities = np.clip(probabilities, 0, 1)
        probabilities /= probabilities.sum() if probabilities.sum() > 0 else 1
        return probabilities

    def get_disease_severity(self, disease: str, background: Dict[str, Any]) -> str:
        """Return severity level for a disease, adjusted by session data"""
        high_severity = [
            "Pneumonia", "Dengue", "Tuberculosis", "Heart attack", "Paralysis (brain hemorrhage)",
            "Typhoid", "Hepatitis B", "Hepatitis C", "Hepatitis D", "Hepatitis E", "AIDS"
        ]
        medium_severity = [
            "Diabetes", "Chronic cholestasis", "Hypertension", "Bronchial Asthma", "Alcoholic hepatitis",
            "Jaundice", "Malaria", "Chicken pox", "Gastroenteritis", "Hyperthyroidism", "Hypothyroidism"
        ]
        if 'timing_intensity' in background and 'severity' in background['timing_intensity']:
            severity_score = float(background['timing_intensity']['severity']) if background['timing_intensity']['severity'].isdigit() else 0
            if severity_score > 7 and disease in medium_severity:
                return "high"
        if disease in high_severity:
            return "high"
        elif disease in medium_severity:
            return "medium"
        return "low"

    def format_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format diagnosis with a medical disclaimer"""
        disclaimer = (
            "DISCLAIMER: This is an AI-generated diagnosis based on reported symptoms and should not be "
            "considered a substitute for professional medical advice. The information provided is for "
            "educational purposes only. Please consult a qualified healthcare provider for diagnosis, "
            "treatment recommendations, and answers to your personal medical questions."
        )
        return {"diagnosis": results, "disclaimer": disclaimer}

    def diagnose(self, symptoms: List[str], background: Dict[str, Any] = None) -> Dict[str, Any]:
        """Returns both a fast local and a secondary LLM‐refined diagnosis."""
        clean_symptoms = [s.strip().lower() for s in (symptoms if isinstance(symptoms, list) else [symptoms]) if isinstance(s, str) and s.strip()]
        bg = background or {}

        primary_diagnosis_list = self.generate_diagnosis(clean_symptoms, bg)
        response_payload = self.format_results(primary_diagnosis_list)

        secondary_diagnosis_list = []
        if self.llm_client:
            try:
                secondary_diagnosis_list = self._llm_refine_diagnosis(clean_symptoms, primary_diagnosis_list)
            except Exception as e:
                print(f"LLM refinement step failed: {e}")
        
        response_payload["secondary_diagnosis"] = secondary_diagnosis_list
        return response_payload