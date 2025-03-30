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

security = HTTPBearer()

# Cache JWKS to reduce HTTP calls
@lru_cache(maxsize=1)
def get_jwks():
    try:
        response = requests.get(CLERK_JWKS_URL)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to fetch JWKS"
        )

def verify_clerk_jwt(token: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        jwks = get_jwks()
        header = jwt.get_unverified_header(token.credentials)
        rsa_key = next(
            (key for key in jwks["keys"] if key["kid"] == header["kid"]),
            None
        )
        
        if not rsa_key:
            raise credentials_exception

        payload = jwt.decode(
            token.credentials,
            rsa_key,
            algorithms=[ALGORITHMS.RS256],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False}  # Clerk doesn't use audience claim
        )
        return payload
    except JWTError as e:
        raise credentials_exception from e

def get_current_user(payload: dict = Depends(verify_clerk_jwt)):
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


security = HTTPBearer(auto_error=False)

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    if not credentials:
        return None
    try:
        payload = verify_clerk_jwt(credentials)
        return payload.get("sub")
    except HTTPException:
        return None