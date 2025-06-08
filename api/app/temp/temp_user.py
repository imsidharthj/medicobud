import uuid
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
import threading

class TempUserManager:
    """
    Manages temporary users that exist only in memory for the duration of the session.
    No data is persisted to the database for temporary users.
    """
    
    def __init__(self):
        self._temp_users: Dict[str, Dict[str, Any]] = {}
        self._temp_sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        # Auto-cleanup after 24 hours of inactivity
        self._cleanup_interval = 24 * 60 * 60  # 24 hours in seconds
        
    def generate_temp_user_id(self) -> str:
        """Generate a unique temporary user ID"""
        return f"temp_user_{uuid.uuid4().hex[:12]}"
    
    def create_temp_user(self, user_id: Optional[str] = None) -> str:
        """Create a new temporary user and return their ID"""
        if not user_id:
            user_id = self.generate_temp_user_id()
        
        with self._lock:
            self._temp_users[user_id] = {
                "id": user_id,
                "created_at": datetime.now(),
                "last_activity": datetime.now(),
                "sessions": [],
                "is_temporary": True
            }
        
        return user_id
    
    def is_temp_user(self, user_id: str) -> bool:
        """Check if a user ID belongs to a temporary user"""
        return user_id and (user_id.startswith("temp_user_") or user_id in self._temp_users)
    
    def get_temp_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get temporary user data"""
        with self._lock:
            if user_id in self._temp_users:
                # Update last activity
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
                self._temp_users[user_id]["sessions"].append(session_id)
                self._temp_users[user_id]["last_activity"] = datetime.now()
    
    def create_temp_session(self, session_id: str, user_id: Optional[str] = None) -> str:
        """Create a temporary session in memory"""
        if not user_id:
            user_id = self.create_temp_user()
        
        with self._lock:
            self._temp_sessions[session_id] = {
                "session_id": session_id,
                "user_id": user_id,
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
            
            # Add session to user if it's a temp user
            if self.is_temp_user(user_id):
                self.add_session_to_temp_user(user_id, session_id)
        
        return user_id
    
    def get_temp_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get temporary session data"""
        with self._lock:
            if session_id in self._temp_sessions:
                # Update last activity
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
                        "email": None,  # Temp users don't have emails
                        "is_temporary": True
                    })
        
        return sorted(sessions, key=lambda x: x["start_time"], reverse=True)
    
    def cleanup_expired_data(self):
        """Remove expired temporary users and sessions"""
        current_time = datetime.now()
        expiry_threshold = current_time - timedelta(seconds=self._cleanup_interval)
        
        with self._lock:
            # Remove expired users
            expired_users = [
                user_id for user_id, user_data in self._temp_users.items()
                if user_data["last_activity"] < expiry_threshold
            ]
            
            for user_id in expired_users:
                del self._temp_users[user_id]
            
            # Remove expired sessions
            expired_sessions = [
                session_id for session_id, session_data in self._temp_sessions.items()
                if session_data["last_activity"] < expiry_threshold
            ]
            
            for session_id in expired_sessions:
                del self._temp_sessions[session_id]
    
    def clear_temp_user_data(self, user_id: str):
        """Manually clear all data for a temporary user"""
        with self._lock:
            # Remove user
            if user_id in self._temp_users:
                del self._temp_users[user_id]
            
            # Remove associated sessions
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

# Global instance
temp_user_manager = TempUserManager()