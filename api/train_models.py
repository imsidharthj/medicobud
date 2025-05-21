import os
import pandas as pd
import sys
from datetime import datetime

# Add the current directory to Python path to enable imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")

def main():
    print("\n===== Starting Medical Diagnosis System Training Process =====\n")
    start_time = datetime.now()
    
    # Set up necessary directories
    print("Creating necessary directories...")
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    # Ensure the dataset is in the right format
    print("Checking dataset format...")
    try:
        df = pd.read_csv(DATASET_PATH)
        print(f"Dataset loaded successfully with {len(df)} records")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return
    
    # Step 1: Process symptom relationships
    print("\n----- Step 1: Processing Symptom Relationships -----")
    try:
        # Import directly using relative imports
        from app.services.preprocess import create_symptom_relationships, calculate_symptom_weights
        
        print("Creating symptom relationships...")
        create_symptom_relationships(DATASET_PATH, os.path.join(DATA_DIR, "symptom_relationships.csv"))
        
        print("Calculating symptom weights...")
        calculate_symptom_weights(DATASET_PATH, os.path.join(DATA_DIR, "symptom_weights.csv"))
    except Exception as e:
        print(f"Error in preprocessing step: {e}")
        return
    
    # Step 2: Train the interview model (decision tree)
    print("\n----- Step 2: Training Interview Model -----")
    try:
        from app.services.interview_service import InterviewService
        
        print("Training interview model...")
        interview_service = InterviewService(
            model_path=os.path.join(MODELS_DIR, "decision_tree.pkl"), 
            dataset_path=DATASET_PATH,
            relationships_path=os.path.join(DATA_DIR, "symptom_relationships.csv")
        )
        print("Interview model training complete")
    except Exception as e:
        print(f"Error training interview model: {e}")
        return
    
    # Step 3: Train the diagnosis model
    print("\n----- Step 3: Training Diagnosis Model -----")
    try:
        from app.services.diagnosis_service import DiagnosisService
        
        print("Training diagnosis model...")
        diagnosis_service = DiagnosisService(
            dataset_path=DATASET_PATH,
            weights_path=os.path.join(DATA_DIR, "symptom_weights.csv")
        )
        
        # Test the diagnosis model with a sample
        test_symptoms = ["fever", "cough", "fatigue"]
        print(f"Testing diagnosis model with symptoms: {test_symptoms}")
        result = diagnosis_service.diagnose(test_symptoms)
        print(f"Sample diagnosis results: {len(result['diagnosis'])} potential conditions identified")
        
    except Exception as e:
        print(f"Error training diagnosis model: {e}")
        return
    
    # Confirm training completion
    end_time = datetime.now()
    training_time = end_time - start_time
    
    print(f"\n===== Training Complete! =====")
    print(f"Total training time: {training_time}")
    print("The following models have been trained:")
    print("  - Interview Model (Decision Tree)")
    print("  - Diagnosis Model (Naive Bayes)")
    print("\nThe system is now ready to use!")

if __name__ == "__main__":
    main()