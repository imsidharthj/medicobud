from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MultiLabelBinarizer
import numpy as np
import pandas as pd
from typing import List, Dict, Any
import os
from collections import defaultdict

class DiagnosisService:
    def __init__(self, dataset_path: str = "dataset.csv", weights_path: str = "data/symptom_weights.csv"):
        self.classifier = CalibratedClassifierCV(LogisticRegression(max_iter=1000))  # Better probability calibration
        self.mlb = MultiLabelBinarizer()
        self.dataset_path = dataset_path
        self.weights_path = weights_path
        self.symptom_weights = self.load_symptom_weights()
        self.disease_symptom_map = defaultdict(set)
        self.load_and_train_model()

    def load_symptom_weights(self) -> Dict[str, float]:
        """Load symptom weights with validation"""
        if os.path.exists(self.weights_path):
            df = pd.read_csv(self.weights_path)
            return dict(zip(df['symptom'], df['weight'].clip(lower=0.5, upper=3.0)))  # Constrain weights
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

        # Build disease-symptom mapping and prepare training data
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

        # Apply symptom weights during feature encoding
        X = self.mlb.fit_transform(symptoms_list)
        
        # Fix: Using NumPy's element-wise multiplication instead of .multiply()
        weights_array = np.array([self.symptom_weights.get(s, 1.0) for s in self.mlb.classes_])
        X_weighted = X * weights_array  # Element-wise multiplication

        self.classifier.fit(X_weighted, diseases)

    def generate_diagnosis(self, symptoms: List[str], background: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Enhanced diagnosis generation with weighted symptoms"""
        if not symptoms:
            return []

        # Create weighted input vector
        X_input = self.mlb.transform([symptoms])
        
        # Fix: Using NumPy's element-wise multiplication instead of .multiply()
        weights_array = np.array([self.symptom_weights.get(s, 1.0) for s in self.mlb.classes_])
        X_weighted = X_input * weights_array  # Element-wise multiplication

        # Get calibrated probabilities
        probabilities = self.classifier.predict_proba(X_weighted)[0]
        
        # Apply clinical adjustments
        probabilities = self.apply_clinical_adjustments(probabilities, symptoms, background or {})
        
        # Process results
        results = []
        seen_diseases = set()
        for prob, disease in sorted(zip(probabilities, self.classifier.classes_), reverse=True):
            prob_percent = round(prob * 100, 1)
            
            # Filter and deduplicate
            if prob_percent < 1.0 or disease in seen_diseases:
                continue
                
            seen_diseases.add(disease)
            
            # Calculate symptom coverage
            disease_symptoms = self.disease_symptom_map[disease]
            matched = len(disease_symptoms & set(symptoms))
            coverage = round(matched/len(disease_symptoms)*100) if disease_symptoms else 0
            
            results.append({
                "disease": disease,
                "confidence": prob_percent,
                "symptom_coverage": coverage,
                "severity": self.get_disease_severity(disease),
                "key_symptoms": list(disease_symptoms & set(symptoms))
            })

        return results[:10]  # Return top 10 results

    def apply_clinical_adjustments(self, probabilities, symptoms, background):
        """Evidence-based probability adjustments"""
        adjustments = {
            'age': {
                'conditions': [(70, 1.2), (40, 1.0), (18, 0.9)],
                'diseases': ['Hypertension', 'Diabetes', 'Dementia']
            },
            'gender': {
                'F': {'Endometriosis': 1.5, 'Prostate Cancer': 0.01},
                'M': {'Prostate Cancer': 1.5, 'Ovarian Cancer': 0.01}
            }
        }
        
        # Age-based adjustments
        if 'age' in background:
            age = background['age']
            for max_age, factor in adjustments['age']['conditions']:
                if age > max_age:
                    for disease in adjustments['age']['diseases']:
                        if disease in self.classifier.classes_:
                            idx = list(self.classifier.classes_).index(disease)
                            probabilities[idx] *= factor
                    break
        
        # Gender-based adjustments
        if 'gender' in background:
            gender = background['gender'].upper()
            for disease, factor in adjustments['gender'].get(gender, {}).items():
                if disease in self.classifier.classes_:
                    idx = list(self.classifier.classes_).index(disease)
                    probabilities[idx] *= factor
        
        # Normalize probabilities
        probabilities /= probabilities.sum()
        return probabilities

    def get_disease_severity(self, disease: str) -> str:
        """Return severity level for a disease."""
        # Severity mappings for common diseases
        high_severity = [
            "Pneumonia", "Dengue", "Tuberculosis", "Heart attack", "Paralysis (brain hemorrhage)",
            "Typhoid", "Hepatitis B", "Hepatitis C", "Hepatitis D", "Hepatitis E", "AIDS"
        ]
        
        medium_severity = [
            "Diabetes", "Chronic cholestasis", "Hypertension", "Bronchial Asthma", "Alcoholic hepatitis",
            "Jaundice", "Malaria", "Chicken pox", "Gastroenteritis", "Hyperthyroidism", "Hypothyroidism"
        ]
        
        if disease in high_severity:
            return "high"
        elif disease in medium_severity:
            return "medium"
        else:
            return "low"

    def format_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format diagnosis with a medical disclaimer."""
        disclaimer = (
            "DISCLAIMER: This is an AI-generated diagnosis based on reported symptoms and should not be "
            "considered a substitute for professional medical advice. The information provided is for "
            "educational purposes only. Please consult a qualified healthcare provider for diagnosis, "
            "treatment recommendations, and answers to your personal medical questions."
        )
        return {"diagnosis": results, "disclaimer": disclaimer}

    def diagnose(self, symptoms: List[str], background: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate and format a diagnosis."""
        background = background or {}
        results = self.generate_diagnosis(symptoms, background)
        return self.format_results(results)