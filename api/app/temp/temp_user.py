import redis
import uuid
import json
import hashlib
import threading
import asyncio
from datetime import datetime, timedelta, date
from typing import Dict, Optional, Any, List
from enum import Enum
from fastapi import HTTPException, Request
import os

class FeatureType(Enum):
    DIAGNOSIS = "diagnosis"
    LAB_REPORT = "lab_report"
    CONSULTATION = "consultation"
    HEALTH_TRACKER = "health_tracker"
    CHAT = "chat"

class UniversalTempUserManager:
    """
    Universal Redis-based temporary user management system that works across all features
    with persistent storage, rate limiting, and browser fingerprinting.
    """
    
    def __init__(self, redis_url: str = None, fallback_to_memory: bool = True):
        self.fallback_to_memory = fallback_to_memory
        self._memory_fallback = {}
        self._lock = threading.RLock()
        
        # Configuration
        self.TEMP_USER_TTL = 24 * 60 * 60  # 24 hours
        self.SESSION_TTL = 30 * 60  # 30 minutes inactivity
        self.CLEANUP_INTERVAL = 1 * 60 * 60  # 1 hour cleanup cycle
        
        # Feature limits per temp user
        self.FEATURE_LIMITS = {
            FeatureType.DIAGNOSIS: {"daily": 10, "hourly": 3},
            FeatureType.LAB_REPORT: {"daily": 5, "hourly": 2},
            FeatureType.CONSULTATION: {"daily": 3, "hourly": 1},
            FeatureType.HEALTH_TRACKER: {"daily": 20, "hourly": 5},
            FeatureType.CHAT: {"daily": 50, "hourly": 10}
        }
        
        # Initialize Redis connection
        try:
            redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            self.use_redis = True
            print("✅ Redis connected successfully for Universal Temp User Manager")
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            if fallback_to_memory:
                print("🔄 Falling back to memory-based temp user management")
                self.use_redis = False
            else:
                raise HTTPException(503, "Redis unavailable and fallback disabled")
        
        # Start background cleanup task
        self._cleanup_task = None
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """Start background cleanup task"""
        def cleanup_worker():
            while True:
                try:
                    self.cleanup_expired_data()
                    threading.Event().wait(self.CLEANUP_INTERVAL)
                except Exception as e:
                    print(f"Error in cleanup task: {e}")
                    threading.Event().wait(self.CLEANUP_INTERVAL)
        
        self._cleanup_task = threading.Thread(target=cleanup_worker, daemon=True)
        self._cleanup_task.start()
        print("🧹 Background cleanup task started for temp users")
    
    def generate_temp_user_id(self, request: Request = None) -> str:
        """Generate a secure temporary user ID with optional fingerprinting"""
        if request:
            # Create fingerprint-based ID for better persistence
            user_agent = request.headers.get("user-agent", "")
            client_ip = self._get_client_ip(request)
            accept_language = request.headers.get("accept-language", "")
            
            # Create daily rotating fingerprint
            fingerprint = f"{user_agent}_{client_ip}_{accept_language}_{datetime.now().date()}"
            fingerprint_hash = hashlib.sha256(fingerprint.encode()).hexdigest()[:12]
            return f"temp_fp_{fingerprint_hash}"
        else:
            return f"temp_user_{uuid.uuid4().hex[:12]}"
    
    def create_temp_user_from_request(self, request: Request) -> str:
        """Create temp user with browser fingerprinting for persistence"""
        temp_user_id = self.generate_temp_user_id(request)
        
        # Check if fingerprint-based user already exists
        if self._temp_user_exists(temp_user_id):
            self._update_temp_user_activity(temp_user_id)
            return temp_user_id
        
        # Create new temp user
        user_data = {
            "id": temp_user_id,
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", ""),
            "fingerprint_hash": hashlib.sha256(f"{request.headers.get('user-agent', '')}_{self._get_client_ip(request)}".encode()).hexdigest(),
            "session_date": datetime.now().date().isoformat(),
            "feature_usage": {feature.value: {"daily_count": 0, "hourly_count": 0, "last_used": None, "last_hour_reset": datetime.now().isoformat()} for feature in FeatureType},
            "is_temporary": True,
            "active_sessions": {}
        }
        
        self._store_temp_user(temp_user_id, user_data)
        print(f"🆕 Created new temp user: {temp_user_id}")
        return temp_user_id
    
    def create_anonymous_temp_user(self) -> str:
        """Create a completely anonymous temporary user"""
        user_id = f"temp_anon_{uuid.uuid4().hex[:12]}"
        
        user_data = {
            "id": user_id,
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "client_ip": "unknown",
            "user_agent": "unknown",
            "fingerprint_hash": None,
            "session_date": datetime.now().date().isoformat(),
            "feature_usage": {feature.value: {"daily_count": 0, "hourly_count": 0, "last_used": None, "last_hour_reset": datetime.now().isoformat()} for feature in FeatureType},
            "is_temporary": True,
            "active_sessions": {}
        }
        
        self._store_temp_user(user_id, user_data)
        print(f"🆕 Created anonymous temp user: {user_id}")
        return user_id
    
    def check_feature_access(self, temp_user_id: str, feature: FeatureType) -> Dict[str, Any]:
        """Check if temp user can access feature based on limits"""
        user_data = self._get_temp_user(temp_user_id)
        if not user_data:
            raise HTTPException(404, "Temporary user not found or expired")
        
        # Get feature limits
        limits = self.FEATURE_LIMITS.get(feature, {"daily": 5, "hourly": 2})
        feature_usage = user_data.get("feature_usage", {}).get(feature.value, {
            "daily_count": 0, "hourly_count": 0, "last_used": None, "last_hour_reset": datetime.now().isoformat()
        })
        
        # Reset daily count if new day
        today = datetime.now().date().isoformat()
        if user_data.get("session_date") != today:
            user_data["session_date"] = today
            for feat_key in user_data["feature_usage"]:
                user_data["feature_usage"][feat_key]["daily_count"] = 0
            self._store_temp_user(temp_user_id, user_data)
            feature_usage["daily_count"] = 0
        
        # Reset hourly count if new hour
        current_time = datetime.now()
        last_hour_reset = datetime.fromisoformat(feature_usage.get("last_hour_reset", current_time.isoformat()))
        if (current_time - last_hour_reset).total_seconds() >= 3600:  # 1 hour
            feature_usage["hourly_count"] = 0
            feature_usage["last_hour_reset"] = current_time.isoformat()
            user_data["feature_usage"][feature.value] = feature_usage
            self._store_temp_user(temp_user_id, user_data)
        
        # Check daily limit
        if feature_usage["daily_count"] >= limits["daily"]:
            raise HTTPException(
                429, 
                {
                    "error": f"Daily limit exceeded for {feature.value}",
                    "limit": limits["daily"],
                    "used": feature_usage["daily_count"],
                    "reset_time": "24 hours",
                    "suggestion": "Please sign in or create an account for unlimited access"
                }
            )
        
        # Check hourly limit
        if feature_usage["hourly_count"] >= limits["hourly"]:
            next_reset = last_hour_reset + timedelta(hours=1)
            raise HTTPException(
                429,
                {
                    "error": f"Hourly limit exceeded for {feature.value}",
                    "limit": limits["hourly"],
                    "used": feature_usage["hourly_count"],
                    "reset_time": next_reset.isoformat(),
                    "suggestion": f"Try again after {next_reset.strftime('%H:%M')}"
                }
            )
        
        return {
            "allowed": True,
            "remaining_daily": limits["daily"] - feature_usage["daily_count"],
            "remaining_hourly": limits["hourly"] - feature_usage["hourly_count"],
            "feature": feature.value,
            "limits": limits
        }
    
    def create_feature_session(self, temp_user_id: str, feature: FeatureType, session_data: Dict = None) -> str:
        """Create a session for a specific feature with rate limiting"""
        
        # Check access first
        access_info = self.check_feature_access(temp_user_id, feature)
        
        # Generate session ID
        session_id = f"session_{feature.value}_{uuid.uuid4().hex[:8]}"
        
        # Create session data
        session = {
            "session_id": session_id,
            "temp_user_id": temp_user_id,
            "feature": feature.value,
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "data": session_data or {},
            "messages": [],
            "status": "active",
            "is_temporary": True
        }
        
        # Store session with TTL
        self._store_temp_session(session_id, session)
        
        # Update user activity and feature usage
        self._record_feature_usage(temp_user_id, feature, session_id)
        
        print(f"🎯 Created {feature.value} session: {session_id} for user: {temp_user_id}")
        return session_id
    
    def get_temp_session(self, session_id: str) -> Optional[Dict]:
        """Get temp session and refresh TTL"""
        session = self._get_temp_session(session_id)
        if session:
            # Update activity and refresh TTL
            session["last_activity"] = datetime.now().isoformat()
            self._store_temp_session(session_id, session)
        return session
    
    def update_temp_session(self, session_id: str, data: Dict):
        """Update session data and refresh TTL"""
        session = self._get_temp_session(session_id)
        if session:
            session["data"].update(data)
            session["last_activity"] = datetime.now().isoformat()
            self._store_temp_session(session_id, session)
    
    def add_message_to_temp_session(self, session_id: str, sender: str, text: str):
        """Add message to session and refresh TTL"""
        session = self._get_temp_session(session_id)
        if session:
            message = {
                "sender": sender,
                "text": text,
                "timestamp": datetime.now().isoformat()
            }
            session["messages"].append(message)
            session["last_activity"] = datetime.now().isoformat()
            self._store_temp_session(session_id, session)
    
    def get_temp_user_stats(self, temp_user_id: str) -> Dict:
        """Get comprehensive stats for temp user"""
        user_data = self._get_temp_user(temp_user_id)
        if not user_data:
            return {"error": "Temporary user not found"}
        
        # Calculate remaining limits
        remaining_limits = {}
        for feature, limits in self.FEATURE_LIMITS.items():
            feature_usage = user_data.get("feature_usage", {}).get(feature.value, {"daily_count": 0, "hourly_count": 0})
            remaining_limits[feature.value] = {
                "daily_remaining": max(0, limits["daily"] - feature_usage["daily_count"]),
                "hourly_remaining": max(0, limits["hourly"] - feature_usage["hourly_count"]),
                "daily_limit": limits["daily"],
                "hourly_limit": limits["hourly"]
            }
        
        return {
            "temp_user_id": temp_user_id,
            "created_at": user_data.get("created_at"),
            "last_activity": user_data.get("last_activity"),
            "is_temporary": True,
            "feature_usage": user_data.get("feature_usage", {}),
            "remaining_limits": remaining_limits,
            "active_sessions": len(user_data.get("active_sessions", {}))
        }
    
    def get_temp_user_sessions(self, temp_user_id: str, feature: FeatureType = None) -> List[Dict]:
        """Get all sessions for a temp user, optionally filtered by feature"""
        if not self.is_temp_user(temp_user_id):
            return []
        
        sessions = []
        if self.use_redis:
            # Get all session keys
            pattern = f"temp_session:session_*"
            if feature:
                pattern = f"temp_session:session_{feature.value}_*"
            
            session_keys = self.redis_client.keys(pattern)
            for key in session_keys:
                session_data = self.redis_client.get(key)
                if session_data:
                    session = json.loads(session_data)
                    if session.get("temp_user_id") == temp_user_id:
                        sessions.append({
                            "session_id": session["session_id"],
                            "feature": session["feature"],
                            "start_time": session["created_at"],
                            "status": session.get("status", "active"),
                            "is_temporary": True
                        })
        else:
            # Memory fallback
            with self._lock:
                for key, session_data in self._memory_fallback.items():
                    if (key.startswith("temp_session:") and 
                        session_data.get("temp_user_id") == temp_user_id):
                        if not feature or session_data.get("feature") == feature.value:
                            sessions.append({
                                "session_id": session_data["session_id"],
                                "feature": session_data["feature"],
                                "start_time": session_data["created_at"],
                                "status": session_data.get("status", "active"),
                                "is_temporary": True
                            })
        
        return sorted(sessions, key=lambda x: x["start_time"], reverse=True)
    
    def clear_temp_user_data(self, temp_user_id: str):
        """Clear all data for a temp user"""
        if self.use_redis:
            # Delete user data
            self.redis_client.delete(f"temp_user:{temp_user_id}")
            
            # Find and delete all sessions for this user
            session_keys = self.redis_client.keys(f"temp_session:*")
            for key in session_keys:
                session_data = self.redis_client.get(key)
                if session_data:
                    session = json.loads(session_data)
                    if session.get("temp_user_id") == temp_user_id:
                        self.redis_client.delete(key)
        else:
            # Memory fallback
            with self._lock:
                self._memory_fallback.pop(f"temp_user:{temp_user_id}", None)
                # Remove sessions
                keys_to_remove = [k for k in self._memory_fallback.keys() 
                                if k.startswith("temp_session:") and 
                                self._memory_fallback[k].get("temp_user_id") == temp_user_id]
                for key in keys_to_remove:
                    del self._memory_fallback[key]
        
        print(f"🗑️ Cleared all data for temp user: {temp_user_id}")
    
    def is_temp_user(self, user_id: str) -> bool:
        """Check if user ID is a temporary user"""
        if not user_id:
            return False
        return (user_id.startswith("temp_") or self._temp_user_exists(user_id))
    
    def cleanup_expired_data(self):
        """Clean up expired temporary users and sessions (for memory fallback only)"""
        if self.use_redis:
            # Redis handles expiration automatically, but we can still do some cleanup
            print("🧹 Redis auto-expiration active, minimal cleanup performed")
            return
        
        # Memory cleanup
        current_time = datetime.now()
        expiry_threshold = current_time - timedelta(seconds=self.TEMP_USER_TTL)
        session_expiry = current_time - timedelta(seconds=self.SESSION_TTL)
        
        with self._lock:
            # Clean expired users
            expired_users = []
            for key, user_data in self._memory_fallback.items():
                if key.startswith("temp_user:"):
                    last_activity = datetime.fromisoformat(user_data.get("last_activity", current_time.isoformat()))
                    if last_activity < expiry_threshold:
                        expired_users.append(key)
            
            for key in expired_users:
                del self._memory_fallback[key]
            
            # Clean expired sessions
            expired_sessions = []
            for key, session_data in self._memory_fallback.items():
                if key.startswith("temp_session:"):
                    last_activity = datetime.fromisoformat(session_data.get("last_activity", current_time.isoformat()))
                    if last_activity < session_expiry:
                        expired_sessions.append(key)
            
            for key in expired_sessions:
                del self._memory_fallback[key]
            
            if expired_users or expired_sessions:
                print(f"🧹 Cleaned up {len(expired_users)} expired users and {len(expired_sessions)} expired sessions")
    
    def get_system_stats(self) -> Dict:
        """Get system-wide statistics"""
        if self.use_redis:
            user_count = len(self.redis_client.keys("temp_user:*"))
            session_count = len(self.redis_client.keys("temp_session:*"))
        else:
            with self._lock:
                user_count = len([k for k in self._memory_fallback.keys() if k.startswith("temp_user:")])
                session_count = len([k for k in self._memory_fallback.keys() if k.startswith("temp_session:")])
        
        return {
            "storage_type": "redis" if self.use_redis else "memory",
            "temp_users_count": user_count,
            "temp_sessions_count": session_count,
            "feature_limits": {f.value: limits for f, limits in self.FEATURE_LIMITS.items()},
            "cleanup_interval": self.CLEANUP_INTERVAL,
            "session_ttl": self.SESSION_TTL,
            "user_ttl": self.TEMP_USER_TTL
        }
    
    # Private helper methods
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _temp_user_exists(self, temp_user_id: str) -> bool:
        """Check if temp user exists"""
        if self.use_redis:
            return bool(self.redis_client.exists(f"temp_user:{temp_user_id}"))
        else:
            return f"temp_user:{temp_user_id}" in self._memory_fallback
    
    def _get_temp_user(self, temp_user_id: str) -> Optional[Dict]:
        """Get temp user data"""
        if self.use_redis:
            data = self.redis_client.get(f"temp_user:{temp_user_id}")
            return json.loads(data) if data else None
        else:
            return self._memory_fallback.get(f"temp_user:{temp_user_id}")
    
    def _store_temp_user(self, temp_user_id: str, user_data: Dict):
        """Store temp user with TTL"""
        user_data["last_activity"] = datetime.now().isoformat()
        
        if self.use_redis:
            self.redis_client.setex(
                f"temp_user:{temp_user_id}",
                self.TEMP_USER_TTL,
                json.dumps(user_data, default=str)
            )
        else:
            with self._lock:
                self._memory_fallback[f"temp_user:{temp_user_id}"] = user_data
    
    def _get_temp_session(self, session_id: str) -> Optional[Dict]:
        """Get temp session data"""
        if self.use_redis:
            data = self.redis_client.get(f"temp_session:{session_id}")
            return json.loads(data) if data else None
        else:
            return self._memory_fallback.get(f"temp_session:{session_id}")
    
    def _store_temp_session(self, session_id: str, session_data: Dict):
        """Store temp session with TTL"""
        session_data["last_activity"] = datetime.now().isoformat()
        
        if self.use_redis:
            self.redis_client.setex(
                f"temp_session:{session_id}",
                self.SESSION_TTL,
                json.dumps(session_data, default=str)
            )
        else:
            with self._lock:
                self._memory_fallback[f"temp_session:{session_id}"] = session_data
    
    def _update_temp_user_activity(self, temp_user_id: str):
        """Update user activity timestamp and refresh TTL"""
        user_data = self._get_temp_user(temp_user_id)
        if user_data:
            self._store_temp_user(temp_user_id, user_data)
    
    def _record_feature_usage(self, temp_user_id: str, feature: FeatureType, session_id: str = None):
        """Record feature usage and update counters"""
        user_data = self._get_temp_user(temp_user_id)
        if user_data:
            feature_key = feature.value
            if "feature_usage" not in user_data:
                user_data["feature_usage"] = {}
            if feature_key not in user_data["feature_usage"]:
                user_data["feature_usage"][feature_key] = {
                    "daily_count": 0, "hourly_count": 0, "last_used": None, "last_hour_reset": datetime.now().isoformat()
                }
            
            # Increment counters
            user_data["feature_usage"][feature_key]["daily_count"] += 1
            user_data["feature_usage"][feature_key]["hourly_count"] += 1
            user_data["feature_usage"][feature_key]["last_used"] = datetime.now().isoformat()
            
            # Track active session
            if session_id:
                if "active_sessions" not in user_data:
                    user_data["active_sessions"] = {}
                user_data["active_sessions"][session_id] = {
                    "feature": feature_key,
                    "created_at": datetime.now().isoformat()
                }
            
            self._store_temp_user(temp_user_id, user_data)

# Global instance - this will be used across all features
temp_user_manager = UniversalTempUserManager()

# Legacy compatibility functions (for existing code)
def create_temp_user(user_id: str = None) -> str:
    """Legacy compatibility function"""
    if user_id:
        return user_id
    return temp_user_manager.create_anonymous_temp_user()

def is_temp_user(user_id: str) -> bool:
    """Legacy compatibility function"""
    return temp_user_manager.is_temp_user(user_id)

def get_temp_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Legacy compatibility function"""
    return temp_user_manager._get_temp_user(user_id)

def clear_temp_user_data(user_id: str):
    """Legacy compatibility function"""
    temp_user_manager.clear_temp_user_data(user_id)

def get_session_count() -> Dict[str, int]:
    """Legacy compatibility function"""
    stats = temp_user_manager.get_system_stats()
    return {
        "temp_users": stats["temp_users_count"],
        "temp_sessions": stats["temp_sessions_count"]
    }