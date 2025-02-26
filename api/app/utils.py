import csv
from fuzzywuzzy import fuzz

unique_symptoms = set()

def load_disease_data(csv_file_path):
    diseases_dict = {}
    try:
        with open(csv_file_path, mode='r') as file:
            csv_reader = csv.reader(file)
            next(csv_reader)  # Skip headers
            for row in csv_reader:
                disease = row[0]
                symptoms = [symptom.strip() for symptom in row[1:] if symptom.strip()]
                diseases_dict[disease] = symptoms
                unique_symptoms.update(symptoms)
    except FileNotFoundError:
        print(f"File {csv_file_path} not found. Loading default dataset.")
        diseases_dict = load_default_disease_data()
    return diseases_dict

def load_default_disease_data():
    diseases_dict = {
        "Common Cold": ["continuous_sneezing", "chills", "fatigue", "cough", "high_fever", "headache", "swelled_lymph_nodes", "malaise", "phlegm", "throat_irritation", "redness_of_eyes", "sinus_pressure", "runny_nose", "congestion", "chest_pain", "loss_of_smell", "muscle_pain"],
        "Flu": ["fever", "chills", "muscle pain", "fatigue", "cough"],
        "COVID-19": ["fever", "dry cough", "tiredness", "loss of taste or smell"],
        "Fungal infection": ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic _patches"],
        "Allergy": ["continuous_sneezing", "shivering", "chills", "watering_from_eyes"],
        "GERD": ["stomach_pain", "acidity", "ulcers_on_tongue", "vomiting", "cough", "chest_pain"],
        "Chronic cholestasis": ["itching", "vomiting", "yellowish_skin", "nausea", "loss_of_appetite", "abdominal_pain", "yellowing_of_eyes"],
        "Drug Reaction": ["itching", "skin_rash", "stomach_pain", "burning_micturition", "spotting_ urination"],
        "Peptic ulcer diseae": ["vomiting", "loss_of_appetite", "abdominal_pain", "passage_of_gases", "internal_itching"],
        "AIDS": ["muscle_wasting", "patches_in_throat", "high_fever", "extra_marital_contacts"],
        "Diabetes ": ["fatigue", "weight_loss", "restlessness", "lethargy", "irregular_sugar_level", "blurred_and_distorted_vision", "obesity", "excessive_hunger", "increased_appetite", "polyuria"],
        "Gastroenteritis": ["vomiting", "sunken_eyes", "dehydration", "diarrhoea"],
        "Bronchial Asthma": ["fatigue", "cough", "high_fever", "breathlessness", "family_history", "mucoid_sputum"],
        "Hypertension": ["headache", "chest_pain", "dizziness", "loss_of_balance", "lack_of_concentration"],
        "Migraine": ["acidity", "indigestion", "headache", "blurred_and_distorted_vision", "excessive_hunger", "stiff_neck", "depression", "irritability", "visual_disturbances"],
        "Cervical spondylosis": ["back_pain", "weakness_in_limbs", "neck_pain", "dizziness", "loss_of_balance"],
        "Paralysis (brain hemorrhage)": ["vomiting", "headache", "weakness_of_one_body_side", "altered_sensorium"],
        "Jaundice": ["itching", "vomiting", "fatigue", "weight_loss", "high_fever", "yellowish_skin", "dark_urine", "abdominal_pain"],
        "Malaria": ["chills", "vomiting", "high_fever", "sweating", "headache", "nausea", "muscle_pain", "diarrhoea"],
        "Chicken pox": ["itching", "skin_rash", "fatigue", "lethargy", "high_fever", "headache", "loss_of_appetite", "mild_fever", "swelled_lymph_nodes", "malaise", "red_spots_over_body"],
        "Dengue": ["skin_rash", "chills", "joint_pain", "vomiting", "fatigue", "high_fever", "headache", "nausea", "loss_of_appetite", "pain_behind_the_eyes", "back_pain", "muscle_pain", "red_spots_over_body"],
        "Typhoid": ["chills", "vomiting", "fatigue", "high_fever", "nausea", "constipation", "abdominal_pain", "diarrhoea", "toxic_look_(typhos)", "belly_pain"],
        "hepatitis A": ["itching", "vomiting", "fatigue", "weight_loss", "high_fever", "yellowish_skin", "dark_urine", "nausea", "loss_of_appetite", "abdominal_pain", "yellowing_of_eyes", "muscle_pain"],
        "Hepatitis B": ["itching", "fatigue", "lethargy", "yellowish_skin", "dark_urine", "loss_of_appetite", "abdominal_pain", "yellow_urine", "yellowing_of_eyes", "malaise", "receiving_blood_transfusion", "receiving_unsterile_injections"],
        "Hepatitis C": ["fatigue", "yellowish_skin", "nausea", "loss_of_appetite", "family_history"],
        "Hepatitis D": ["joint_pain", "vomiting", "fatigue", "yellowish_skin", "dark_urine", "nausea", "loss_of_appetite", "abdominal_pain", "yellowing_of_eyes"],
        "Hepatitis E": ["joint_pain", "vomiting", "fatigue", "high_fever", "yellowish_skin", "dark_urine", "nausea", "loss_of_appetite", "abdominal_pain", "yellowing_of_eyes", "coma", "stomach_bleeding", "acute_liver_failure"],
        "Alcoholic hepatitis": ["vomiting", "yellowish_skin", "abdominal_pain", "swelling_of_stomach", "distention_of_abdomen", "history_of_alcohol_consumption", "fluid_overload"],
        "Tuberculosis": ["chills", "vomiting", "fatigue", "weight_loss", "cough", "high_fever", "breathlessness", "sweating", "loss_of_appetite", "mild_fever", "yellowing_of_eyes", "swelled_lymph_nodes", "malaise", "phlegm", "chest_pain", "blood_in_sputum"],
        "Dimorphic hemmorhoids(piles)": ["constipation", "pain_during_bowel_movements", "pain_in_anal_region", "bloody_stool", "irritation_in_anus"],
        "Heart attack": ["vomiting", "breathlessness", "sweating", "chest_pain"],
        "Varicose veins": ["fatigue", "cramps", "bruising", "obesity", "swollen_legs", "swollen_blood_vessels", "prominent_veins_on_calf"],
        "Hypothyroidism": ["fatigue", "weight_gain", "cold_hands_and_feets", "mood_swings", "lethargy", "dizziness", "puffy_face_and_eyes", "enlarged_thyroid", "brittle_nails", "swollen_extremeties", "depression", "irritability", "abnormal_menstruation"],
        "Hyperthyroidism": ["fatigue", "mood_swings", "weight_loss", "restlessness", "sweating", "diarrhoea", "fast_heart_rate", "excessive_hunger", "muscle_weakness", "irritability", "abnormal_menstruation"],
        "Hypoglycemia": ["vomiting", "fatigue", "anxiety", "sweating", "headache", "nausea", "blurred_and_distorted_vision", "excessive_hunger", "slurred_speech", "irritability", "palpitations"],
        "Osteoarthristis": ["joint_pain", "neck_pain", "knee_pain", "hip_joint_pain", "swelling_joints", "painful_walking"],
        "Arthritis": ["muscle_weakness", "stiff_neck", "swelling_joints", "movement_stiffness", "painful_walking"],
        "(vertigo) Paroymsal  Positional Vertigo": ["vomiting", "headache", "nausea", "spinning_movements", "loss_of_balance", "unsteadiness"],
        "Acne": ["skin_rash", "pus_filled_pimples", "blackheads", "scurring"],
        "Urinary tract infection": ["burning_micturition", "bladder_discomfort", "foul_smell_of urine", "continuous_feel_of_urine"],
        "Psoriasis": ["skin_rash", "joint_pain", "skin_peeling", "silver_like_dusting", "small_dents_in_nails", "inflammatory_nails"],
        "Impetigo": ["skin_rash", "high_fever", "red_sore_around_nose", "yellow_crust_ooze"],
        "Hemorrhoids": ["pain_during_bowel_movements", "bloody_stool", "irritation_in_anus"],
        "Fungal infection (Ringworms)": ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic _patches"],
        "Chronic cholestasis": ["itching", "vomiting", "yellowish_skin", "nausea", "loss_of_appetite", "abdominal_pain", "yellowing_of_eyes"]
    }
    for symptoms in diseases_dict.values():
        for symptom in symptoms:
            unique_symptoms.add(symptom)
    return diseases_dict

def match_symptoms(diseases_dict, symptoms_to_match, threshold=80):
    matched_diseases = []
    for disease, symptoms in diseases_dict.items():
        if all(any(fuzz.ratio(symptom, s) >= threshold for s in symptoms) for symptom in symptoms_to_match):
            matched_diseases.append(disease)
    return matched_diseases
