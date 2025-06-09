import uuid
import time
from datetime import datetime, timedelta, date
from typing import Dict, Optional, Any
import threading
from fastapi import HTTPException

class TempUserManager:
    """
    Manages temporary users that exist only in memory for the duration of the session.
    No data is persisted to the database for temporary users.
    """
    
    def __init__(self):
        self._temp_users: Dict[str, Dict[str, Any]] = {}
        self._temp_sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()
        self._cleanup_interval = 24 * 60 * 60 # 24 hours
        self.MAX_DAILY_SESSIONS = 10
        
    def generate_temp_user_id(self) -> str:
        """Generate a unique temporary user ID"""
        return f"temp_user_{uuid.uuid4().hex[:12]}"
    
    def create_temp_user(self, user_id: Optional[str] = None) -> str:
        """Create a new temporary user if they don't exist. Returns the user ID."""
        if not user_id:
            user_id = self.generate_temp_user_id()
        
        with self._lock:
            if user_id not in self._temp_users:
                self._temp_users[user_id] = {
                    "id": user_id,
                    "created_at": datetime.now(),
                    "last_activity": datetime.now(),
                    "sessions": [],
                    "is_temporary": True,
                    "daily_session_count": 0,
                    "session_date": datetime.now().date()
                }
        return user_id
    
    def is_temp_user(self, user_id: str) -> bool:
        """Check if a user ID belongs to a temporary user"""
        return user_id and (user_id.startswith("temp_user_") or user_id in self._temp_users)
    
    def get_temp_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get temporary user data"""
        with self._lock:
            if user_id in self._temp_users:
                self._temp_users[user_id]["last_activity"] = datetime.now()
                return self._temp_users[user_id].copy()
        return None
    
    def update_temp_user_activity(self, user_id: str):
        """Update the last activity timestamp for a temporary user"""
        with self._lock:
            if user_id in self._temp_users:
                self._temp_users[user_id]["last_activity"] = datetime.now()
    
    def add_session_to_temp_user(self, user_id: str, session_id: str):
        """Associate a session with a temporary user"""
        with self._lock:
            if user_id in self._temp_users:
                if "sessions" not in self._temp_users[user_id] or not isinstance(self._temp_users[user_id]["sessions"], list):
                    self._temp_users[user_id]["sessions"] = []
                self._temp_users[user_id]["sessions"].append(session_id)
                self._temp_users[user_id]["last_activity"] = datetime.now()
    
    def create_temp_session(self, session_id: str, user_id: Optional[str] = None) -> str:
        """Create a temporary session in memory, enforcing daily limits."""
        actual_user_id = self.create_temp_user(user_id=user_id)

        with self._lock:
            user_data = self._temp_users[actual_user_id] 

            today = datetime.now().date()
            
            if user_data.get("session_date") != today:
                user_data["session_date"] = today
                user_data["daily_session_count"] = 0
            
            if user_data.get("daily_session_count", 0) >= self.MAX_DAILY_SESSIONS:
                raise HTTPException(
                    status_code=429, 
                    detail="Daily session limit reached for guest user. Please sign in or create an account to continue."
                )

            user_data["daily_session_count"] = user_data.get("daily_session_count", 0) + 1
            
            self._temp_sessions[session_id] = {
                "session_id": session_id,
                "user_id": actual_user_id,
                "created_at": datetime.now(),
                "last_activity": datetime.now(),
                "messages": [],
                "symptoms": [],
                "background_traits": {},
                "timing_intensity": {},
                "care_medication": {},
                "diagnosis_results": None,
                "status": "in_progress",
                "is_temporary": True
            }
            
            self.add_session_to_temp_user(actual_user_id, session_id)
        
        return actual_user_id
    
    def get_temp_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get temporary session data"""
        with self._lock:
            if session_id in self._temp_sessions:
                self._temp_sessions[session_id]["last_activity"] = datetime.now()
                return self._temp_sessions[session_id].copy()
        return None
    
    def update_temp_session(self, session_id: str, data: Dict[str, Any]):
        """Update temporary session data"""
        with self._lock:
            if session_id in self._temp_sessions:
                self._temp_sessions[session_id].update(data)
                self._temp_sessions[session_id]["last_activity"] = datetime.now()
    
    def add_message_to_temp_session(self, session_id: str, sender: str, text: str):
        """Add a message to a temporary session"""
        message = {
            "sender": sender,
            "text": text,
            "timestamp": datetime.now().isoformat()
        }
        
        with self._lock:
            if session_id in self._temp_sessions:
                self._temp_sessions[session_id]["messages"].append(message)
                self._temp_sessions[session_id]["last_activity"] = datetime.now()
    
    def get_temp_user_sessions(self, user_id: str) -> list:
        """Get all sessions for a temporary user"""
        if not self.is_temp_user(user_id):
            return []
        
        sessions = []
        with self._lock:
            for session_id, session_data in self._temp_sessions.items():
                if session_data.get("user_id") == user_id:
                    sessions.append({
                        "session_id": session_id,
                        "start_time": session_data["created_at"].isoformat(),
                        "status": session_data.get("status", "in_progress"),
                        "email": None,
                        "is_temporary": True
                    })
        
        return sorted(sessions, key=lambda x: x["start_time"], reverse=True)
    
    def cleanup_expired_data(self):
        """Remove expired temporary users and sessions"""
        current_time = datetime.now()
        expiry_threshold = current_time - timedelta(seconds=self._cleanup_interval)
        
        with self._lock:
            expired_users = [
                user_id for user_id, user_data in self._temp_users.items()
                if user_data["last_activity"] < expiry_threshold
            ]
            
            for user_id in expired_users:
                del self._temp_users[user_id]
            
            expired_sessions = [
                session_id for session_id, session_data in self._temp_sessions.items()
                if session_data["last_activity"] < expiry_threshold
            ]
            
            for session_id in expired_sessions:
                del self._temp_sessions[session_id]
    
    def clear_temp_user_data(self, user_id: str):
        """Manually clear all data for a temporary user"""
        with self._lock:
            if user_id in self._temp_users:
                del self._temp_users[user_id]
            
            sessions_to_remove = [
                session_id for session_id, session_data in self._temp_sessions.items()
                if session_data.get("user_id") == user_id
            ]
            
            for session_id in sessions_to_remove:
                del self._temp_sessions[session_id]
    
    def get_session_count(self) -> Dict[str, int]:
        """Get statistics about temporary data"""
        with self._lock:
            return {
                "temp_users": len(self._temp_users),
                "temp_sessions": len(self._temp_sessions)
            }

temp_user_manager = TempUserManager()