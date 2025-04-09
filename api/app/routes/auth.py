from fastapi import APIRouter, Depends, HTTPException
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
        if not hasattr(user_profile, field) or getattr(user_profile, field) is None:
            missing_fields.append(field)
    return missing_fields

@router.get("/verify")
async def verify_profile_completion(request: Request, db: Session = Depends(get_db)):
    
    try:
        data = await request.json()
        email = data.get("email")

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