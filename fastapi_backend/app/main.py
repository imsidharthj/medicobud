from fastapi import FastAPI, HTTPException
# from .models import PatientData, MatchedDiseasesResponse
from .utils import load_disease_data, match_symptoms
# from .services import diagnose_symptoms
from typing import List
from pydantic import BaseModel

app = FastAPI()

# Load disease data at startup
diseases_dict = load_disease_data("dataset.csv")

@app.get("/")
def root():
    return {"message": "This the testing of Diagnosis API."}

class PatientData(BaseModel):
    name: str
    age: int
    symptoms: List[str]

class MatchedDiseasesResponse(BaseModel):
    name: str
    age: int
    symptoms: List[str]
    matched_diseases: List[str]

def diagnose_symptoms(symptoms, diseases_dict):
    return match_symptoms(diseases_dict, symptoms)

@app.post("/", response_model=MatchedDiseasesResponse)
def diagnose_patient(data: PatientData):
    if len(data.symptoms) < 3:
        raise HTTPException(status_code=400, detail="Please provide at least three symptoms.")

    matched_diseases = diagnose_symptoms(data.symptoms, diseases_dict)
    if not matched_diseases:
        raise HTTPException(status_code=404, detail="No diseases matched the entered symptoms.")

    return {
        "name": data.name,
        "age": data.age,
        "symptoms": data.symptoms,
        "matched_diseases": matched_diseases,
    }
