from pydantic import BaseModel
from typing import List

class PatientData(BaseModel):
    name: str
    age: int
    symptoms: List[str]

class MatchedDiseasesResponse(BaseModel):
    name: str
    age: int
    symptoms: List[str]
    matched_diseases: List[str]
