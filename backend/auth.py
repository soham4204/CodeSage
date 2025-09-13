# backend/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

# This scheme will handle extracting the token from the "Authorization: Bearer <token>" header
token_auth_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(token_auth_scheme)):
    try:
        token = credentials.credentials
        print("🔑 Received token:", token[:30], "...")  # log first part only
        decoded_token = auth.verify_id_token(token)
        print("✅ Decoded token:", decoded_token)
        return decoded_token
    except Exception as e:
        print("❌ Token verification failed:", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
