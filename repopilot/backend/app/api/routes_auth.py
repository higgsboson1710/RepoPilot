from typing import Optional
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.database import (
    create_or_login_google_user,
    register_email_user,
    authenticate_email_user,
)

router = APIRouter()


class GoogleAuthRequest(BaseModel):
    access_token: Optional[str] = None  # Real Google OAuth2 Access Token from google.accounts.oauth2.initTokenClient popup
    credential: Optional[str] = None    # Real Google ID Token (JWT) from google.accounts.id
    email: Optional[str] = None         # Interactive dev-mode fallback email
    name: Optional[str] = None
    avatar_url: Optional[str] = ""


class EmailSignupRequest(BaseModel):
    name: str
    email: str
    password: str


class EmailLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/google")
async def google_login_or_signup(payload: GoogleAuthRequest):
    """
    POST /api/v1/auth/google:
    1. If a real Google OAuth2 access_token is passed from the Google Account Chooser popup,
       verifies it against Google's official https://www.googleapis.com/oauth2/v3/userinfo endpoint
       to retrieve the user's real Gmail, full name, and Google profile photo.
    2. If a Google JWT credential (ID token) is passed, verifies it via oauth2.googleapis.com/tokeninfo.
    3. Also supports interactive fallback login when testing locally before creating a Google Client ID.
    """
    email = payload.email
    name = payload.name
    avatar_url = payload.avatar_url or ""

    async with httpx.AsyncClient(timeout=10.0) as client:
        if payload.access_token:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.access_token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired Google OAuth access token")
            user_info = resp.json()
            email = user_info.get("email")
            name = user_info.get("name") or (email.split("@")[0] if email else "Google User")
            avatar_url = user_info.get("picture", "")

        elif payload.credential:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.credential},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google OAuth ID token")
            token_data = resp.json()
            email = token_data.get("email")
            name = token_data.get("name") or (email.split("@")[0] if email else "Google User")
            avatar_url = token_data.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google OAuth token or email is required")

    display_name = name or email.split("@")[0]
    return create_or_login_google_user(email=email, name=display_name, avatar_url=avatar_url)


@router.post("/auth/signup")
async def email_signup(payload: EmailSignupRequest):
    """POST /api/v1/auth/signup: Creates a new user account with email and password."""
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    try:
        return register_email_user(
            email=payload.email,
            name=payload.name,
            password=payload.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
async def email_login(payload: EmailLoginRequest):
    """POST /api/v1/auth/login: Authenticates an existing user with email and password."""
    try:
        return authenticate_email_user(email=payload.email, password=payload.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
