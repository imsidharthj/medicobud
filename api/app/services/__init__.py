# This file marks the services directory as a Python package
from ..utils import load_disease_data, match_symptoms

def diagnose_symptoms(symptoms, diseases_dict):
    """
    Return matching diseases based on provided symptoms
    """
    return match_symptoms(diseases_dict, symptoms)