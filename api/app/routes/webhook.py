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
                else:
                    print("User is already active")
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

        return {"success": True}

    except WebhookVerificationError as err:
        raise HTTPException(status_code=400, detail={"success": False, "message": str(err)})
