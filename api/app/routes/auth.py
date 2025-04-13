from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import UserProfile

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"]
)

REQUIRED_FIELD = [
    "first_name", "last_name", "email", "date_of_birth", 
    "gender", "weight", "allergies"
]

def check_missing_fields(user_profile):
    missing_fields = []
    for field in REQUIRED_FIELD:
        value = getattr(user_profile, field, None)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing_fields.append(field)
    return missing_fields


@router.get("/verify")
async def verify_profile_completion(email: str, db: Session = Depends(get_db)):
    
    try:
        # data = await request.json()
        # email = data.get("email")

        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        user = db.query(UserProfile).filter(UserProfile.email == email).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        missing_fields = check_missing_fields(user)
        is_complete = len(missing_fields) == 0
        
        return {
            "profile_complete": is_complete,
            "missing_fields": missing_fields,
            "email": email
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in verify_profile_completion: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post('/complete-profile')
async def complete_profile(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Endpoint to complete the user profile.
    """
    try:
        profile_data = await request.json()
        email = profile_data.get("email")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        user = db.query(UserProfile).filter(UserProfile.email == email).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update user profile with provided data
        for field, value in profile_data.items():
            if hasattr(user, field) and field in REQUIRED_FIELD:
                setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        # Recalculate missing fields after update
        missing_fields = check_missing_fields(user)
        is_complete = len(missing_fields) == 0
        
        return {
            "profile_complete": is_complete,
            "missing_fields": missing_fields,
            "email": email
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in complete_profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")