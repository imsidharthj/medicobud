from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import UserProfile

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"]
)

@router.get("/verify/{user_id}")
def verify_profile_completion(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint for the frontend to verify if a user's profile is complete.
    This should be called after authentication with Clerk is successful.
    """
    # Look up the user in the database
    user = db.query(UserProfile).filter(UserProfile.clerk_user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check which required fields are missing
    missing_fields = []
    required_fields = [
        "first_name", "last_name", "email", "date_of_birth", 
        "gender", "weight", "allergies"
    ]
    
    for field in required_fields:
        if not hasattr(user, field) or getattr(user, field) is None:
            missing_fields.append(field)
    
    is_complete = len(missing_fields) == 0
    
    # Update the profile status
    user.profile_status = "complete" if is_complete else "incomplete"
    user.missing_fields = missing_fields
    db.commit()
    
    # Return the status to the frontend
    return {
        "profile_complete": is_complete,
        "missing_fields": missing_fields,
        "user_id": user_id
    }

@router.get("/verify/email/{email}")
def verify_profile_completion(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint for the frontend to verify if a user's profile is complete.
    This should be called after authentication with Clerk is successful.
    Uses email instead of user_id for identification.
    """
    # Look up the user in the database by email
    user = db.query(UserProfile).filter(UserProfile.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check which required fields are missing
    missing_fields = []
    required_fields = [
        "first_name", "last_name", "date_of_birth", 
        "gender", "weight", "allergies"
    ]
    
    for field in required_fields:
        if not hasattr(user, field) or getattr(user, field) is None:
            missing_fields.append(field)
    
    is_complete = len(missing_fields) == 0
    
    # Update the profile status
    user.profile_status = "complete" if is_complete else "incomplete"
    user.missing_fields = missing_fields
    db.commit()
    
    # Return the status to the frontend
    return {
        "profile_complete": is_complete,
        "missing_fields": missing_fields,
        "email": email
    }