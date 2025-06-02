from fastapi import APIRouter, HTTPException, Depends, Path, Query, FastAPI
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import UserProfile
from app.schemas import UserProfileResponse, UserProfileUpdate, UserProfileResponse
from typing import List

router = APIRouter(
    prefix="/api/profile",
    tags=["profile"]
)

app = FastAPI()

@router.get("/", response_model=UserProfileResponse)
def get_profile( email: str, db: Session = Depends(get_db) ):
    print(f'[GET PROFILE] Fetching profile for: {email}')
    profile = db.query(UserProfile).filter_by(email=email, is_active=True).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if isinstance(profile.allergies, str):
        profile.allergies = [a.strip() for a in profile.allergies.split(",")]
    return profile


@router.put("/update", response_model=UserProfileResponse)
def update_profile( update_data: UserProfileUpdate, email: str, db: Session = Depends(get_db) ):
    print(f'[UPDATE PROFILE] Updating profile for: {email}')
    profile = db.query(UserProfile).filter_by(email=email).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_dict = update_data.dict(exclude_unset=True)

    for field, value in update_dict.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)

    if profile.allergies is not None and isinstance(profile.allergies, str):
        profile.allergies = [a.strip() for a in profile.allergies.split(',') if a.strip()]
    elif profile.allergies is None:
        profile.allergies = []
        
    return profile