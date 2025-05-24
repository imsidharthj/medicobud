import os
import pandas as pd
import sys
from datetime import datetime

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")

def main():
    start_time = datetime.now()
    
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    try:
        df = pd.read_csv(DATASET_PATH)
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return
    
    try:
        from app.services.preprocess import create_symptom_relationships, calculate_symptom_weights
        
        create_symptom_relationships(DATASET_PATH, os.path.join(DATA_DIR, "symptom_relationships.csv"))
        calculate_symptom_weights(DATASET_PATH, os.path.join(DATA_DIR, "symptom_weights.csv"))
    except Exception as e:
        print(f"Error in preprocessing step: {e}")
        return
    
    try:
        from app.services.interview_service import InterviewService
        
        interview_service = InterviewService(
            model_path=os.path.join(MODELS_DIR, "decision_tree.pkl"), 
            dataset_path=DATASET_PATH,
            relationships_path=os.path.join(DATA_DIR, "symptom_relationships.csv")
        )
    except Exception as e:
        print(f"Error training interview model: {e}")
        return
    
    try:
        from app.services.diagnosis_service import DiagnosisService
        
        diagnosis_service = DiagnosisService(
            dataset_path=DATASET_PATH,
            weights_path=os.path.join(DATA_DIR, "symptom_weights.csv")
        )
        
        test_symptoms = ["fever", "cough", "fatigue"]
        result = diagnosis_service.diagnose(test_symptoms)
        
    except Exception as e:
        print(f"Error training diagnosis model: {e}")
        return
    
    end_time = datetime.now()
    training_time = end_time - start_time
    
    print(f"Training complete in {training_time}")

if __name__ == "__main__":
    main()