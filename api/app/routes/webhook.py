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

def check_missing_fields(user_profile):
    missing_fields = []

    for field in REQUIRED_FIELD:
        if not hasattr(user_profile, field) or getattr(user_profile, field) is None:
            missing_fields.append(field)
    return missing_fields

def get_verified_email(email_addresses):
    if not email_addresses:
        return None

    if email_addresses:
        for email_entry in email_addresses:
            verification_status = email_entry.get("verification", {}).get("status")
            if verification_status == "verified":
                return email_entry["email_address"]
    return email_addresses[0].get("email_address") if email_addresses else None

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

        email = get_verified_email(event_data.get("email_addresses", []))

        if not email:
            print("No verified email found in event data.")
            return {"success": False, "message": "No verified email found in event data."}

        if event_type == "user.created":
            user_id = event_data.get("id")
            first_name = event_data.get("first_name")
            last_name = event_data.get("last_name")
            print(f"new user details {first_name}, {last_name}, {email}")

            existing_user = db.query(UserProfile).filter(
                or_(UserProfile.clerk_user_id == user_id, UserProfile.email == email)
            ).first()
            
            if existing_user:
                print("User already exists")
                if not existing_user.is_active:
                    existing_user.is_active = True
                    existing_user.first_name = first_name
                    existing_user.last_name = last_name
                    existing_user.clerk_user_id = user_id
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
            user = db.query(UserProfile).filter(
                or_(UserProfile.clerk_user_id == user_id, UserProfile.email == email)
            ).first()

            if user:                
                user.clerk_user_id = user_id
                user.first_name = event_data.get("first_name", user.first_name)
                user.last_name = event_data.get("last_name", user.last_name)
                user.date_of_birth = event_data.get("birthdate", user.date_of_birth)
                
                db.commit()
                print(f"Updated user {user_id}")
                user_profile = user
    
        elif event_type == "user.deleted":
            user_id = event_data.get("id")
            print(f"Deleting user {user_id}")
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
            missing_fields = check_missing_fields(user_profile)
            is_complete = len(missing_fields) == 0

            response_data.update({
                "profile_complete": is_complete,
                "missing_fields": missing_fields,
                "email": email,
            })
            
            print(f"User {user_profile.clerk_user_id} profile status: {'complete' if is_complete else 'incomplete'}")
            if not is_complete:
                print(f"Missing fields: {missing_fields}")

        return response_data

    except WebhookVerificationError as err:
        raise HTTPException(status_code=400, detail={"success": False, "message": str(err)})
    except Exception as e:
        print(f"Unexpected webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail={"success": False, "message": "Internal server error"})
