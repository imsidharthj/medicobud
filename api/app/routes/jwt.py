# jwt.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from jose.constants import ALGORITHMS
from typing import Optional
import requests
import os
from functools import lru_cache

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_ISSUER = os.getenv("CLERK_ISSUER")

print(f"[JWT] CLERK_JWKS_URL: {CLERK_JWKS_URL}")
print(f"[JWT] CLERK_ISSUER: {CLERK_ISSUER}")

security = HTTPBearer()

# Cache JWKS to reduce HTTP calls
@lru_cache(maxsize=1)
def get_jwks():
    print("[JWT] Fetching JWKS from:", CLERK_JWKS_URL)
    try:
        response = requests.get(CLERK_JWKS_URL)
        print("[JWT] JWKS response status code:", response.status_code)
        response.raise_for_status()
        print("[JWT] Successfully fetched JWKS")
        return response.json()
    except requests.RequestException as e:
        print("[JWT] Error fetching JWKS:", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to fetch JWKS"
        )

def verify_clerk_jwt(token: HTTPAuthorizationCredentials = Depends(security)):
    print("[JWT] Verifying JWT token")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        jwks = get_jwks()
        print("[JWT] JWKS obtained:", jwks)
        header = jwt.get_unverified_header(token.credentials)
        print("[JWT] JWT header:", header)
        rsa_key = next(
            (key for key in jwks["keys"] if key["kid"] == header["kid"]),
            None
        )
        print("[JWT] Matching RSA key:", rsa_key)
        
        if not rsa_key:
            print("[JWT] No matching RSA key found")
            raise credentials_exception

        payload = jwt.decode(
            token.credentials,
            rsa_key,
            algorithms=[ALGORITHMS.RS256],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False, 'verify_exp': True}  # Clerk doesn't use audience claim
        )
        print("[JWT] JWT payload:", payload)
        return payload
    except JWTError as e:
        print("[JWT] JWTError during token verification:", str(e))
        raise credentials_exception from e

def get_current_user(payload: dict = Depends(verify_clerk_jwt)):
    user_id = payload.get("sub")
    print("[JWT] Current user ID:", user_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


security = HTTPBearer(auto_error=False)

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    if not credentials:
        print("[JWT] No credentials provided, proceeding without user context")
        return None
    try:
        payload = verify_clerk_jwt(credentials)
        print("[JWT] Current user ID:", payload.get("sub"))
        return payload.get("sub")
    except HTTPException:
        print("[JWT] Invalid token, proceeding without user context", str(e))
        return None