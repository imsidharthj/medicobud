from fastapi import FastAPI, HTTPException, APIRouter, Request
from .temp_user import temp_user_manager, FeatureType

# Create router for temp user APIs
router = APIRouter(prefix="/api/temp-user", tags=["temp-user"])

@router.get("/stats/{temp_user_id}")
async def get_temp_user_stats(temp_user_id: str):
    """Get statistics for a temporary user"""
    return temp_user_manager.get_temp_user_stats(temp_user_id)

@router.post("/create")
async def create_temp_user(request: Request):
    """Create a new temporary user with browser fingerprinting"""
    temp_user_id = temp_user_manager.create_temp_user_from_request(request)
    return {
        "temp_user_id": temp_user_id,
        "message": "Temporary user created successfully",
        "storage_type": "redis" if temp_user_manager.use_redis else "memory"
    }

@router.post("/check-access")
async def check_feature_access(request: dict):
    """Check if temp user can access a feature"""
    temp_user_id = request.get("temp_user_id")
    feature = request.get("feature")
    
    if not temp_user_id or not feature:
        raise HTTPException(400, "temp_user_id and feature are required")
    
    try:
        feature_enum = FeatureType(feature)
        return temp_user_manager.check_feature_access(temp_user_id, feature_enum)
    except ValueError:
        raise HTTPException(400, f"Invalid feature: {feature}")

@router.post("/create-session")
async def create_feature_session(request: dict):
    """Create a session for a specific feature"""
    temp_user_id = request.get("temp_user_id")
    feature = request.get("feature")
    session_data = request.get("session_data", {})
    
    if not temp_user_id or not feature:
        raise HTTPException(400, "temp_user_id and feature are required")
    
    try:
        feature_enum = FeatureType(feature)
        session_id = temp_user_manager.create_feature_session(temp_user_id, feature_enum, session_data)
        return {
            "session_id": session_id,
            "feature": feature,
            "temp_user_id": temp_user_id
        }
    except ValueError:
        raise HTTPException(400, f"Invalid feature: {feature}")

@router.get("/sessions/{temp_user_id}")
async def get_temp_user_sessions(temp_user_id: str, feature: str = None):
    """Get all sessions for a temporary user"""
    feature_enum = None
    if feature:
        try:
            feature_enum = FeatureType(feature)
        except ValueError:
            raise HTTPException(400, f"Invalid feature: {feature}")
    
    return temp_user_manager.get_temp_user_sessions(temp_user_id, feature_enum)

@router.get("/session/{session_id}")
async def get_temp_session(session_id: str, temp_user_id: str = None):
    """Get a specific temporary session"""
    session = temp_user_manager.get_temp_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    # Verify ownership if temp_user_id provided
    if temp_user_id and session.get("temp_user_id") != temp_user_id:
        raise HTTPException(403, "Access denied to this session")
    
    return session

@router.post("/update-session")
async def update_temp_session(request: dict):
    """Update session data"""
    session_id = request.get("session_id")
    data = request.get("data", {})
    
    if not session_id:
        raise HTTPException(400, "session_id is required")
    
    temp_user_manager.update_temp_session(session_id, data)
    return {"message": "Session updated successfully"}

@router.post("/add-message")
async def add_message_to_session(request: dict):
    """Add message to session"""
    session_id = request.get("session_id")
    sender = request.get("sender")
    text = request.get("text")
    
    if not all([session_id, sender, text]):
        raise HTTPException(400, "session_id, sender, and text are required")
    
    temp_user_manager.add_message_to_temp_session(session_id, sender, text)
    return {"message": "Message added successfully"}

@router.post("/activity/{temp_user_id}")
async def update_temp_user_activity(temp_user_id: str, request: dict):
    """Update temp user activity (for lifecycle management)"""
    temp_user_manager._update_temp_user_activity(temp_user_id)
    return {"message": "Activity updated"}

@router.delete("/clear/{temp_user_id}")
async def clear_temp_user(temp_user_id: str):
    """Clear all data for a temporary user"""
    temp_user_manager.clear_temp_user_data(temp_user_id)
    return {"message": "Temporary user data cleared successfully"}

# System-wide statistics endpoint
@router.get("/system/stats")
async def get_system_temp_stats():
    """Get system-wide temporary user statistics"""
    return temp_user_manager.get_system_stats()