import os
import json
import google.generativeai as genai
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MultiLabelBinarizer
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from collections import defaultdict
from fuzzywuzzy import fuzz
from app.utils import unique_symptoms, load_default_disease_data

class DiagnosisService:
    def __init__(self, dataset_path: str = "dataset.csv", weights_path: str = "data/symptom_weights.csv"):
        self.classifier = CalibratedClassifierCV(LogisticRegression(max_iter=1000, class_weight='balanced'))
        self.mlb = MultiLabelBinarizer()
        self.dataset_path = dataset_path
        self.weights_path = weights_path
        self.symptom_weights = self.load_symptom_weights()
        self.disease_symptom_map = defaultdict(set)
        self.fallback_diseases = load_default_disease_data()

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            self.llm_client = None
        else:
            try:
                genai.configure(api_key=api_key)
                self.llm_client = genai.GenerativeModel('gemini-1.5-flash')
            except Exception as e:
                print(f"Error configuring Gemini client: {e}")
                self.llm_client = None

        self.load_and_train_model()

    def normalize_symptom(self, symptom: str) -> str:
        if not isinstance(symptom, str):
            return ""
        normalized = symptom.strip().lower()
        normalized = normalized.replace("dischromic _patches", "dischromic_patches")
        normalized = normalized.replace("spotting_ urination", "spotting_urination")
        normalized = normalized.replace("foul_smell_of urine", "foul_smell_of_urine")
        normalized = normalized.replace(" ", "_")
        return normalized

    def fuzzy_match_symptoms(self, input_symptoms: List[str], threshold: int = 85) -> List[str]:
        matched_symptoms = []
        all_known_symptoms = set()
        all_known_symptoms.update(self.mlb.classes_ if hasattr(self.mlb, 'classes_') else [])
        all_known_symptoms.update(unique_symptoms)
        
        for input_symptom in input_symptoms:
            normalized_input = self.normalize_symptom(input_symptom)
            
            if normalized_input in all_known_symptoms:
                matched_symptoms.append(normalized_input)
                continue
            
            best_match = None
            best_score = 0
            
            for known_symptom in all_known_symptoms:
                score = fuzz.ratio(normalized_input, known_symptom)
                if score > best_score and score >= threshold:
                    best_score = score
                    best_match = known_symptom
            
            if best_match:
                matched_symptoms.append(best_match)
            else:
                matched_symptoms.append(normalized_input)
        
        return matched_symptoms

    def load_symptom_weights(self) -> Dict[str, float]:
        if os.path.exists(self.weights_path):
            df = pd.read_csv(self.weights_path)
            return dict(zip(df['symptom'], df['weight'].clip(lower=0.5, upper=3.0)))
        return self._create_default_weights()

    def _create_default_weights(self) -> Dict[str, float]:
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
        try:
            df = pd.read_csv(self.dataset_path).drop_duplicates().fillna('')
        except FileNotFoundError:
            df = self._create_fallback_dataframe()
        
        symptoms_list, diseases = [], []
        
        if "symptoms" in df.columns:
            for _, row in df.iterrows():
                symptoms = [self.normalize_symptom(s) for s in row['symptoms'].split(',') if s.strip()]
                symptoms_list.append(symptoms)
                diseases.append(row['Disease'].strip())
                self.disease_symptom_map[row['Disease'].strip()].update(symptoms)
        else:
            symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
            for _, row in df.iterrows():
                symptoms = [self.normalize_symptom(str(row[col])) for col in symptom_cols 
                           if pd.notna(row[col]) and str(row[col]).strip()]
                symptoms_list.append(symptoms)
                disease_name = row['Disease'].strip()
                if disease_name == "Peptic ulcer diseae":
                    disease_name = "Peptic ulcer disease"
                diseases.append(disease_name)
                self.disease_symptom_map[disease_name].update(symptoms)
        
        X = self.mlb.fit_transform(symptoms_list)
        weights_array = np.array([self.symptom_weights.get(s, 1.0) for s in self.mlb.classes_])
        X_weighted = X * weights_array
        self.classifier.fit(X_weighted, diseases)

    def _create_fallback_dataframe(self):
        data = []
        for disease, symptoms in self.fallback_diseases.items():
            normalized_symptoms = [self.normalize_symptom(s) for s in symptoms]
            row = {'Disease': disease}
            for i, symptom in enumerate(normalized_symptoms[:17]):
                row[f'Symptom_{i+1}'] = symptom
            data.append(row)
        return pd.DataFrame(data)

    def generate_diagnosis(self, symptoms: List[str], background: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        if not symptoms:
            return []

        clean_symptoms = [s for s in symptoms if isinstance(s, str) and s.strip()]
        if not clean_symptoms:
            return []

        matched_symptoms = self.fuzzy_match_symptoms(clean_symptoms)
        valid_symptoms = [s for s in matched_symptoms if s in self.mlb.classes_]
        
        if not valid_symptoms:
            return self._fallback_diagnosis(matched_symptoms)

        try:
            X_input = self.mlb.transform([valid_symptoms])
        except ValueError as e:
            print(f"Error transforming symptoms: {e}")
            return self._fallback_diagnosis(matched_symptoms)

        weights_array = np.array([self.symptom_weights.get(s, 1.0) for s in self.mlb.classes_])
        X_weighted = X_input * weights_array

        if X_weighted.shape[1] == 0:
            return self._fallback_diagnosis(matched_symptoms)

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

    def _fallback_diagnosis(self, symptoms: List[str]) -> List[Dict[str, Any]]:
        try:
            from app.utils import match_symptoms
            matched_diseases = match_symptoms(self.fallback_diseases, symptoms, threshold=75)
            
            results = []
            for i, disease in enumerate(matched_diseases[:5]):
                confidence = max(85 - i * 5, 50)
                results.append({
                    "disease": disease,
                    "confidence": confidence,
                    "symptom_coverage": 75,
                    "severity": self.get_disease_severity(disease, {}),
                    "key_symptoms": symptoms,
                    "explanations": [f"Matched using fallback method with {len(symptoms)} symptoms"]
                })
            return results
        except Exception as e:
            print(f"Fallback diagnosis failed: {e}")
            return []

    def _llm_refine_diagnosis(self, symptoms: List[str], top_diseases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not self.llm_client or not symptoms:
            return []

        prompt = (
            f"As a medical AI assistant, analyze these symptoms: {', '.join(symptoms)}.\n\n"
            "Provide a list of the 5 most likely medical conditions based on these symptoms. "
            "Consider common conditions first, then less common ones. "
            "Return ONLY a JSON array with this exact format:\n"
            '[\n'
            '  {"disease": "Condition Name", "confidence": 0.85},\n'
            '  {"disease": "Another Condition", "confidence": 0.70}\n'
            ']\n\n'
            "Important:\n"
            "- Use decimal confidence values between 0.0 and 1.0\n"
            "- Order by likelihood (highest confidence first)\n"
            "- Use standard medical condition names\n"
            "- Return only the JSON array, no other text"
        )
        
        try:
            response = self.llm_client.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=1000
                )
            )
            
            text_content = response.text.strip()

            if text_content.startswith("```json"):
                text_content = text_content[7:]
            if text_content.startswith("```"):
                text_content = text_content[3:]
            if text_content.endswith("```"):
                text_content = text_content[:-3]
            
            text_content = text_content.strip()
            
            try:
                data = json.loads(text_content)
                if isinstance(data, list):
                    formatted_results = []
                    for item in data[:5]:
                        if isinstance(item, dict) and "disease" in item:
                            disease = item["disease"]
                            confidence = item.get("confidence", 0.5)
                            
                            if isinstance(confidence, (int, float)):
                                if confidence > 1.0:
                                    confidence = confidence / 100.0
                                confidence = max(0.0, min(1.0, confidence))
                            else:
                                confidence = 0.5
                            
                            formatted_results.append({
                                "disease": disease,
                                "confidence": confidence
                            })
                    
                    return formatted_results
                else:
                    return []
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                return self._extract_diseases_from_text(text_content, symptoms)
                
        except Exception as e:
            print(f"Error calling Google Gemini API: {e}")
            return []

    def _extract_diseases_from_text(self, text: str, symptoms: List[str]) -> List[Dict[str, Any]]:
        common_diseases = [
            "Common Cold", "Influenza", "COVID-19", "Pneumonia", "Bronchitis",
            "Asthma", "Allergies", "Sinusitis", "Migraine", "Tension Headache",
            "Gastroenteritis", "Food Poisoning", "Dehydration", "Anxiety",
            "Depression", "Hypertension", "Diabetes", "Arthritis"
        ]
        
        found_diseases = []
        text_lower = text.lower()
        
        for disease in common_diseases:
            if disease.lower() in text_lower:
                confidence = 0.6
                if any(symptom in ["fever", "cough", "fatigue"] for symptom in symptoms):
                    if disease in ["Common Cold", "Influenza", "COVID-19"]:
                        confidence = 0.8
                
                found_diseases.append({
                    "disease": disease,
                    "confidence": confidence
                })
                
                if len(found_diseases) >= 5:
                    break
        
        if not found_diseases:
            found_diseases = [
                {"disease": "Viral Infection", "confidence": 0.6},
                {"disease": "Bacterial Infection", "confidence": 0.4},
                {"disease": "Allergic Reaction", "confidence": 0.3}
            ]
        
        return found_diseases[:5]

    def apply_clinical_adjustments(self, probabilities, symptoms: List[str], background: Dict[str, Any]) -> np.ndarray:
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
        disclaimer = (
            "DISCLAIMER: This is an AI-generated diagnosis based on reported symptoms and should not be "
            "considered a substitute for professional medical advice. The information provided is for "
            "educational purposes only. Please consult a qualified healthcare provider for diagnosis, "
            "treatment recommendations, and answers to your personal medical questions."
        )
        return {"diagnosis": results, "disclaimer": disclaimer}

    def diagnose(self, symptoms: List[str], background: Dict[str, Any] = None) -> Dict[str, Any]:
        clean_symptoms = [s.strip().lower() for s in (symptoms if isinstance(symptoms, list) else [symptoms]) if isinstance(s, str) and s.strip()]
        bg = background or {}

        primary_diagnosis_list = self.generate_diagnosis(clean_symptoms, bg)
        response_payload = self.format_results(primary_diagnosis_list)

        secondary_diagnosis_list = []
        if self.llm_client:
            try:
                secondary_diagnosis_list = self._llm_refine_diagnosis(clean_symptoms, primary_diagnosis_list)
            except Exception as e:
                print(f"LLM refinement failed: {e}")
        
        response_payload["secondary_diagnosis"] = secondary_diagnosis_list
        return response_payload