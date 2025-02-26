from .utils import load_disease_data, match_symptoms

def diagnose_symptoms(symptoms, diseases_dict):
    return match_symptoms(diseases_dict, symptoms)
