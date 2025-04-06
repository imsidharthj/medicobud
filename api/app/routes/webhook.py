from fastapi import APIRouter, Request, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from svix.webhooks import Webhook, WebhookVerificationError
import os
from dotenv import load_dotenv
from app.db import get_db
from app.models import UserProfile
from sqlalchemy import or_

load_dotenv()

CLERK_WEBHOOK_SIGNING_SECRET = os.getenv("CLERK_WEBHOOK_SIGNING_SECRET")

if not CLERK_WEBHOOK_SIGNING_SECRET:
    raise Exception("Please set the CLERK_WEBHOOK_SIGNING_SECRET environment variable")

router = APIRouter(
    prefix="/api/webhooks",
    tags=["webhooks"]
)

REQUIRED_FIELD = [
    "first_name", "last_name", "email", "date_of_birth", "gender", "weight", "allergies"
]

def is_field_missing(user_profile):
    """
    Check if any of the required fields are missing in the user profile.
    """
    missing_fields = []

    for field in REQUIRED_FIELD:
        if not hasattr(user_profile, field) or getattr(user_profile, field) is None:
            missing_fields.append(field)
    return missing_fields

@router.post("/")
async def clerk_webhook(
    request: Request,
    svix_id: str = Header(None),
    svix_timestamp: str = Header(None),
    svix_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    try:
        payload = await request.body()
        headers = {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }
        
        wh = Webhook(CLERK_WEBHOOK_SIGNING_SECRET)
        event = wh.verify(payload, headers)
        
        event_data = event["data"]
        event_type = event["type"]
        user_profile = None
        created_new_user = False
        print(f"Received event: {event_type}")

        if event_type == "user.created":
            user_id = event_data.get("id")
            first_name = event_data.get("first_name")
            last_name = event_data.get("last_name")
            email = None
            email_addresses = event_data.get("email_addresses")
            if email_addresses:
                for email_entry in email_addresses:
                    verification_status = email_entry.get("verification", {}).get("status")
                    if verification_status == "verified":
                        email = email_entry["email_address"]
                        break
            print(f"new user details {first_name}, {last_name}, {email}")

            # Use filter with or_ instead of filter_by
            existing_user = db.query(UserProfile).filter(
                or_(UserProfile.clerk_user_id == user_id, UserProfile.email == email)
            ).first()
            
            if existing_user:
                print("User already exists")
                if not existing_user.is_active:
                    existing_user.is_active = True
                    existing_user.first_name = first_name
                    existing_user.last_name = last_name
                    db.commit()
                    print("User is reactivated")
                    user_profile = existing_user
                else:
                    print("User is already active")
                    user_profile = existing_user
            else:
                new_user = UserProfile(
                    clerk_user_id=user_id,
                    first_name=first_name,
                    last_name=last_name,
                    email=email
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                print("User is created")
                user_profile = new_user
                created_new_user = True

        elif event_type == "user.updated":
            user_id = event_data.get("id")
            # Optionally extract email if needed
            email = None
            email_addresses = event_data.get("email_addresses")
            if email_addresses:
                for email_entry in email_addresses:
                    verification_status = email_entry.get("verification", {}).get("status")
                    if verification_status == "verified":
                        email = email_entry["email_address"]
                        break

            user = db.query(UserProfile).filter(
                or_(UserProfile.clerk_user_id == user_id, UserProfile.email == email)
            ).first()

            if user:
                # Update email from first verified address
                if email_addresses:
                    for email_entry in email_addresses:
                        verification_status = email_entry.get("verification", {}).get("status")
                        if verification_status == "verified":
                            user.email = email_entry["email_address"]
                            break
                
                # Update other fields
                user.first_name = event_data.get("first_name", user.first_name)
                user.last_name = event_data.get("last_name", user.last_name)
                user.date_of_birth = event_data.get("birthdate", user.date_of_birth)
                
                db.commit()
                print(f"Updated user {user_id}")
                user_profile = user
    
        elif event_type == "user.deleted":
            user_id = event_data.get("id")
            print(f"Deleting user {user_id}")
            print(f'full event data: {event_data}')
            # Optionally extract email if needed
            email = None
            email_addresses = event_data.get("email_addresses")
            if email_addresses:
                for email_entry in email_addresses:
                    verification_status = email_entry.get("verification", {}).get("status")
                    if verification_status == "verified":
                        email = email_entry["email_address"]
                        break

            user = db.query(UserProfile).filter(
                or_(UserProfile.clerk_user_id == user_id, UserProfile.email == email)
            ).first()
            
            if user:
                print(f"Soft-deleting user {user_id}")
                user.is_active = False
                db.commit()
                print(f"[user.deleted] User {user_id} marked as inactive (soft-deleted).")
            else:
                print(f"User {user_id} not found in database.")

        response_data = {"success": True}

        if user_profile and (created_new_user or event_type == "user.updated"):
            missing_fields = is_field_missing(user_profile)
            if missing_fields:
                user_profile.profile_status = "incomplete"
                user_profile.missing_fields = missing_fields
                db.commit()
                print(f"User {user_profile.clerk_user_id} profile is incomplete. Missing fields: {missing_fields}")
                response_data.update({
                    "profile_complete": False,
                    "missing_fields": missing_fields,
                    "user_id": user_profile.clerk_user_id
                })
            else:
                user_profile.profile_status = "complete"
                user_profile.missing_fields = []
                db.commit()
                print(f"User {user_profile.clerk_user_id} profile is complete.")
                response_data.update({
                    "profile_complete": True,
                    "missing_fields": [],
                    "user_id": user_profile.clerk_user_id
                })
        return response_data

    except WebhookVerificationError as err:
        raise HTTPException(status_code=400, detail={"success": False, "message": str(err)})

@router.get("/profile-status/{user_id}")
def check_profile_status(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint to check the profile status of a user.
    """
    user = db.query(UserProfile).filter(UserProfile.clerk_user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check which required fields are missing
    missing_fields = is_field_missing(user)
    
    is_complete = len(missing_fields) == 0
    
    # # Update the profile status
    # user.profile_status = "complete" if is_complete else "incomplete"
    # user.missing_fields = missing_fields
    # db.commit()
    
    # Return the status to the frontend
    return {
        "profile_complete": is_complete,
        "missing_fields": missing_fields,
        "user_id": user_id
    }

@router.post('/complete-profile/{user_id}')
async def complete_profile(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Endpoint to complete the user profile.
    """
    user = db.query(UserProfile).filter(UserProfile.clerk_user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile_data = await request.json()

    for field, value in profile_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    # Update the profile status
    user.profile_status = "complete" if not is_field_missing(user) else "incomplete"
    user.missing_fields = check_missing_fields(user)
    db.commit()
    db.refresh(user)
    
    return {
        "profile_complete": len(user.missing_fields) == 0,
        "missing_fields": user.missing_fields,
        "user_id": user_id
    }