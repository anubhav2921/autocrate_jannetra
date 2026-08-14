import os
import random
import re
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr

from ..mongodb import users_collection
from ..services.sms_service import send_otp_sms, send_email_otp
from ..utils import (
    gen_uuid,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    serialize_doc,
)
from ..firebase_admin_config import (
    is_firebase_available,
    verify_firebase_id_token,
)

logger = logging.getLogger("jannetra.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEPARTMENTS = ["health", "police", "municipal", "electricity", "water", "education", "transport"]

# In-memory OTP stores
_otp_store: Dict[str, Dict[str, Any]] = {}
_phone_otp_store: Dict[str, Dict[str, Any]] = {}


# ==========================================
# PYDANTIC REQUEST MODELS
# ==========================================
class DirectRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "LEADER"
    department: str = ""
    phone: Optional[str] = None


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "LEADER"
    department: str = ""


class OTPVerifyRequest(BaseModel):
    email: str
    otp: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PhoneOTPRequest(BaseModel):
    phone_number: str
    name: Optional[str] = None
    password: Optional[str] = None
    department: Optional[str] = ""


class PhoneOTPVerify(BaseModel):
    phone_number: str
    otp: str
    name: Optional[str] = None
    password: Optional[str] = None
    department: Optional[str] = ""


class CreateUserRequest(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    firebase_uid: Optional[str] = ""
    department: Optional[str] = ""


def _validate_phone(phone: str) -> str:
    cleaned = re.sub(r"\s+", "", str(phone or ""))
    if not re.match(r"^\+[1-9]\d{7,14}$", cleaned):
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number format. Use international E.164 format (e.g. +919876543210)."
        )
    return cleaned


def _format_user_response(user: dict) -> dict:
    """Format user document for safe API responses."""
    return {
        "id": str(user.get("id", "")),
        "name": user.get("name", "User"),
        "email": user.get("email") or "",
        "phone_number": user.get("phone_number") or "",
        "role": user.get("role", "LEADER"),
        "department": user.get("department", ""),
        "picture": user.get("picture") or "",
        "auth_provider": user.get("auth_provider", "jwt"),
        "created_at": user.get("created_at"),
    }


# ==========================================
# AUTH STATUS & CONFIG
# ==========================================
@router.get("/status")
async def get_auth_status():
    """Returns server auth capabilities (JWT primary, Firebase optional)."""
    return {
        "jwt_auth": True,
        "firebase_auth": is_firebase_available(),
        "supported_methods": [
            "email_password_jwt",
            "email_otp_jwt",
            "phone_otp_jwt",
            *(["firebase_google", "firebase_phone"] if is_firebase_available() else ["google_fallback"])
        ]
    }


# ==========================================
# 1. JWT DIRECT REGISTRATION
# ==========================================
@router.post("/register")
async def register(req: DirectRegisterRequest):
    """Direct registration with email and password without mandatory OTP."""
    req_email = req.email.strip().lower()
    if not req_email or "@" not in req_email:
        return {"success": False, "error": "Please provide a valid email address"}

    if len(req.password) < 6:
        return {"success": False, "error": "Password must be at least 6 characters"}

    existing = await users_collection.find_one({"email": req_email})
    if existing:
        return {"success": False, "error": "Email is already registered"}

    user_doc = {
        "id": gen_uuid(),
        "name": req.name.strip() or req_email.split("@")[0],
        "email": req_email,
        "password_hash": hash_password(req.password),
        "role": req.role if req.role in ["LEADER", "CITIZEN", "ADMIN"] else "LEADER",
        "department": req.department.strip(),
        "phone_number": req.phone.strip() if req.phone else None,
        "is_active": True,
        "auth_provider": "jwt",
        "created_at": datetime.utcnow(),
    }
    await users_collection.insert_one(user_doc)

    token = create_access_token(data={
        "user_id": user_doc["id"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "department": user_doc["department"],
    })

    return {
        "success": True,
        "message": "User registered successfully",
        "token": token,
        "user": _format_user_response(user_doc),
    }


# ==========================================
# 2. JWT EMAIL OTP SIGNUP FLOW
# ==========================================
@router.post("/signup")
async def signup(req: SignupRequest):
    """Step 1: Validate info and send email OTP."""
    req_email = req.email.strip().lower()
    if not req_email or "@" not in req_email:
        return {"success": False, "error": "Invalid email address"}

    existing = await users_collection.find_one({"email": req_email})
    if existing:
        return {"success": False, "error": "Email is already registered"}

    otp = str(random.randint(100000, 999999))
    _otp_store[req_email] = {
        "otp": otp,
        "expires": time.time() + 300,
        "signup_data": {
            "name": req.name.strip(),
            "email": req_email,
            "password": req.password,
            "role": req.role,
            "department": req.department,
        },
    }

    send_email_otp(req_email, otp)

    return {
        "success": True,
        "otp_sent": True,
        "message": f"OTP sent to {req_email}",
        "demo_otp": otp,
    }


@router.post("/verify-otp")
async def verify_otp(req: OTPVerifyRequest):
    """Step 2: Verify email OTP, create user, and return JWT."""
    req_email = req.email.strip().lower()
    stored = _otp_store.get(req_email)

    if not stored:
        return {"success": False, "error": "No OTP requested for this email. Please sign up again."}

    if time.time() > float(stored["expires"]):
        _otp_store.pop(req_email, None)
        return {"success": False, "error": "OTP has expired. Please request a new OTP."}

    if str(stored["otp"]) != req.otp.strip():
        return {"success": False, "error": "Invalid OTP. Please check the code and try again."}

    data = stored["signup_data"]
    user_doc = {
        "id": gen_uuid(),
        "name": str(data["name"]),
        "email": req_email,
        "password_hash": hash_password(str(data["password"])),
        "role": str(data.get("role", "LEADER")),
        "department": str(data.get("department", "")),
        "is_active": True,
        "auth_provider": "jwt",
        "created_at": datetime.utcnow(),
    }
    await users_collection.insert_one(user_doc)
    _otp_store.pop(req_email, None)
    
    token = create_access_token(data={
        "user_id": user_doc["id"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "department": user_doc["department"],
    })

    return {
        "success": True,
        "token": token,
        "user": _format_user_response(user_doc),
    }


# ==========================================
# 3. JWT EMAIL/PASSWORD LOGIN
# ==========================================
@router.post("/login")
async def login(req: LoginRequest):
    """Standard Email + Password Login with JWT Token generation."""
    req_email = req.email.strip().lower()
    user = await users_collection.find_one({"email": req_email})

    # Admin development convenience fallback
    if not user and req_email == "admin@email.com" and req.password == "admin":
        admin_doc = {
            "id": gen_uuid(),
            "name": "Administrator",
            "email": "admin@email.com",
            "password_hash": hash_password("admin"),
            "role": "LEADER",
            "department": "municipal",
            "is_active": True,
            "auth_provider": "jwt",
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(admin_doc)
        user = admin_doc

    if not user:
        return {"success": False, "error": "Invalid email or password"}

    # Validate password
    stored_hash = user.get("password_hash", "")
    is_valid = verify_password(req.password, stored_hash)

    # Backward compatibility with plaintext admin fallback
    if not is_valid and req_email == "admin@email.com" and req.password == "admin":
        is_valid = True
        await users_collection.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": hash_password("admin")}}
        )

    if not is_valid:
        return {"success": False, "error": "Invalid email or password"}

    if not user.get("is_active", True):
        return {"success": False, "error": "Account is deactivated. Please contact an administrator."}

    token = create_access_token(data={
        "user_id": user["id"],
        "email": user.get("email", ""),
        "role": user.get("role", "LEADER"),
        "department": user.get("department", ""),
    })

    return {
        "success": True,
        "token": token,
        "user": _format_user_response(user),
    }


# ==========================================
# 4. CURRENT USER & REFRESH ENDPOINTS
# ==========================================
@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the authenticated user's profile from JWT token."""
    return {
        "success": True,
        "user": _format_user_response(current_user)
    }


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh the current user's JWT access token."""
    new_token = create_access_token(data={
        "user_id": current_user["id"],
        "email": current_user.get("email", ""),
        "role": current_user.get("role", "LEADER"),
        "department": current_user.get("department", ""),
    })
    return {
        "success": True,
        "token": new_token,
        "user": _format_user_response(current_user)
    }


# ==========================================
# 5. OPTIONAL GOOGLE AUTH
# ==========================================
@router.post("/google")
async def google_auth(request: Request):
    """Google authentication handler: accepts Google/Firebase ID token, issues backend JWT token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    id_token = auth_header.split("Bearer ")[1].strip()
    decoded_token = verify_firebase_id_token(id_token)

    if not decoded_token or "uid" not in decoded_token:
        # Fallback to local decode
        try:
            import jwt
            decoded_token = jwt.decode(id_token, options={"verify_signature": False})
            if "sub" in decoded_token and "uid" not in decoded_token:
                decoded_token["uid"] = decoded_token["sub"]
        except Exception:
            raise HTTPException(status_code=401, detail="Google authentication failed to verify token.")

    uid = decoded_token.get("uid") or decoded_token.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token payload: missing subject/uid")

    email = (decoded_token.get("email") or "").lower()
    name = decoded_token.get("name") or (email.split("@")[0] if email else "Google User")
    picture = decoded_token.get("picture", "")

    user = await users_collection.find_one({"google_uid": uid})
    if not user and email:
        user = await users_collection.find_one({"email": email})

    if user:
        update_fields = {"google_uid": uid, "picture": picture, "auth_provider": "google"}
        await users_collection.update_one({"id": user["id"]}, {"$set": update_fields})
        user.update(update_fields)
    else:
        user = {
            "id": gen_uuid(),
            "name": name,
            "email": email or None,
            "password_hash": "",
            "role": "LEADER",
            "department": "",
            "google_uid": uid,
            "picture": picture,
            "auth_provider": "google",
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(user)

    token = create_access_token(data={
        "user_id": user["id"],
        "email": user.get("email", ""),
        "role": user.get("role", "LEADER"),
        "department": user.get("department", ""),
    })

    return {
        "message": "Authentication successful",
        "token": token,
        "user": _format_user_response(user),
    }


# ==========================================
# 6. OPTIONAL FIREBASE PHONE & EMAIL LOGIN
# ==========================================
@router.post("/firebase-login")
async def firebase_login(request: Request):
    """Exchange a verified Firebase ID token for a JanNetra JWT token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    id_token = auth_header.split("Bearer ")[1].strip()
    decoded_token = verify_firebase_id_token(id_token)

    if not decoded_token:
        # If Firebase is not configured and verification failed, inform client gracefully
        if not is_firebase_available():
            raise HTTPException(
                status_code=503,
                detail="Firebase Admin SDK is not configured on this server. Please use native Email or Phone OTP authentication."
            )
        raise HTTPException(status_code=401, detail="Invalid Firebase token.")

    uid = decoded_token.get("uid") or decoded_token.get("sub", "")
    phone_number = decoded_token.get("phone_number", "")
    email = (decoded_token.get("email") or "").lower()
    name = decoded_token.get("name", "")
    picture = decoded_token.get("picture", "")

    if not uid and not phone_number and not email:
        raise HTTPException(status_code=400, detail="Token contains no identity claims.")

    user = await users_collection.find_one({"firebase_uid": uid})
    if not user and phone_number:
        user = await users_collection.find_one({"phone_number": phone_number})
    if not user and email:
        user = await users_collection.find_one({"email": email})

    if user:
        update: Dict[str, Any] = {"firebase_uid": uid}
        if phone_number and not user.get("phone_number"):
            update["phone_number"] = phone_number
        if picture and not user.get("picture"):
            update["picture"] = picture
        await users_collection.update_one({"id": user["id"]}, {"$set": update})
        user.update(update)
    else:
        display_name = name or (f"User {phone_number[-4:]}" if phone_number else "User")
        user = {
            "id": gen_uuid(),
            "name": display_name,
            "email": email or None,
            "phone_number": phone_number or None,
            "password_hash": "",
            "role": "LEADER",
            "department": "",
            "firebase_uid": uid,
            "picture": picture,
            "auth_provider": "firebase",
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(user)

    token = create_access_token(data={
        "user_id": user["id"],
        "email": user.get("email", ""),
        "role": user.get("role", "LEADER"),
        "department": user.get("department", ""),
    })

    return {
        "message": "Login successful",
        "token": token,
        "user": _format_user_response(user),
    }


# ==========================================
# 7. NATIVE PHONE OTP AUTH (BACKEND-POWERED)
# ==========================================
@router.post("/send-phone-otp")
def send_phone_otp(req: PhoneOTPRequest):
    """Send SMS OTP for native phone authentication."""
    phone = _validate_phone(req.phone_number)
    otp = str(random.randint(100000, 999999))
    _phone_otp_store[phone] = {
        "otp": otp,
        "expires": time.time() + 300,
        "name": req.name or "",
        "password": req.password or "",
        "department": req.department or "",
    }
    send_otp_sms(phone, otp)
    return {
        "success": True,
        "message": f"OTP sent to {phone}",
        "demo_otp": otp
    }


@router.post("/register-phone")
async def register_phone(req: PhoneOTPVerify):
    """Register user with verified phone OTP and return JWT token."""
    phone = _validate_phone(req.phone_number)
    stored = _phone_otp_store.get(phone)
    if not stored:
        return {"success": False, "error": "No OTP requested for this phone number."}
    if time.time() > float(stored["expires"]):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "OTP has expired. Please request a new one."}
    if str(stored["otp"]) != req.otp.strip():
        return {"success": False, "error": "Invalid OTP. Please try again."}

    existing = await users_collection.find_one({"phone_number": phone})
    if existing:
        _phone_otp_store.pop(phone, None)
        token = create_access_token(data={
            "user_id": existing["id"],
            "email": existing.get("email", ""),
            "role": existing.get("role", "LEADER"),
            "department": existing.get("department", ""),
        })
        return {
            "success": True,
            "message": "Phone number already registered. Logged in.",
            "token": token,
            "user": _format_user_response(existing),
        }

    phone_suffix = phone[-4:] if len(phone) >= 4 else "0000"
    name = req.name or stored.get("name") or f"User {phone_suffix}"
    password = req.password or stored.get("password") or ""
    department = req.department or stored.get("department") or ""

    user = {
        "id": gen_uuid(),
        "name": name,
        "email": None,
        "phone_number": phone,
        "password_hash": hash_password(password) if password else "",
        "role": "LEADER",
        "department": department,
        "auth_provider": "phone",
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await users_collection.insert_one(user)
    _phone_otp_store.pop(phone, None)
    
    token = create_access_token(data={
        "user_id": user["id"],
        "email": "",
        "role": user["role"],
        "department": user["department"],
    })

    return {
        "success": True,
        "message": "Registration successful",
        "token": token,
        "user": _format_user_response(user),
    }


@router.post("/login-phone")
async def login_phone(req: PhoneOTPVerify):
    """Login with verified phone OTP and return JWT token."""
    phone = _validate_phone(req.phone_number)
    stored = _phone_otp_store.get(phone)
    if not stored:
        return {"success": False, "error": "No OTP requested for this phone number."}
    if time.time() > float(stored["expires"]):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "OTP has expired."}
    if str(stored["otp"]) != req.otp.strip():
        return {"success": False, "error": "Invalid OTP."}

    user = await users_collection.find_one({"phone_number": phone})
    if not user:
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "No account found with this phone number."}

    if not user.get("is_active", True):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "Account is deactivated."}

    _phone_otp_store.pop(phone, None)
    token = create_access_token(data={
        "user_id": user["id"],
        "email": user.get("email", ""),
        "role": user.get("role", "LEADER"),
        "department": user.get("department", ""),
    })

    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": _format_user_response(user),
    }


# ==========================================
# 8. USER PROFILE SYNC
# ==========================================
@router.post("/users/create")
async def create_user_profile(req: CreateUserRequest):
    """Sync or create a user profile and return standard JWT."""
    def clean_str(val: Any) -> str:
        return str(val or "").strip()

    email = clean_str(req.email).lower()
    phone_number = clean_str(req.phone)
    firebase_uid = clean_str(req.firebase_uid)
    name = clean_str(req.name)

    if not email and not phone_number and not firebase_uid:
        return {"success": False, "error": "At least one of email, phone, or firebase_uid must be provided."}
    if not name:
        return {"success": False, "error": "Name is required."}

    user = None
    if firebase_uid:
        user = await users_collection.find_one({"firebase_uid": firebase_uid})
    if not user and email:
        user = await users_collection.find_one({"email": email})
    if not user and phone_number:
        user = await users_collection.find_one({"phone_number": phone_number})

    if user:
        update: Dict[str, Any] = {}
        if firebase_uid and not user.get("firebase_uid"):
            update["firebase_uid"] = firebase_uid
        if email and not user.get("email"):
            update["email"] = email
        if phone_number and not user.get("phone_number"):
            update["phone_number"] = phone_number
        if name:
            update["name"] = name
        if req.department and not user.get("department"):
            update["department"] = req.department
        if update:
            await users_collection.update_one({"id": user["id"]}, {"$set": update})
            user.update(update)
    else:
        auth_provider = "firebase" if firebase_uid else ("email" if email else "phone")
        user = {
            "id": gen_uuid(),
            "name": name,
            "email": email or None,
            "phone_number": phone_number or None,
            "password_hash": "",
            "role": "LEADER",
            "department": req.department or "",
            "firebase_uid": firebase_uid or None,
            "auth_provider": auth_provider,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(user)

    token = create_access_token(data={
        "user_id": user["id"],
        "email": user.get("email", ""),
        "role": user.get("role", "LEADER"),
        "department": user.get("department", ""),
    })

    return {
        "success": True,
        "message": "User profile created successfully",
        "token": token,
        "user": _format_user_response(user),
    }


# ==========================================
# 9. AUTHORIZED USER SEARCH
# ==========================================
@router.get("/users/search")
async def get_users_search(
    q: Optional[str] = Query(""),
    current_user: dict = Depends(get_current_user)
):
    """
    Search for eligible assignees based on jurisdiction permission rules.
    """
    # Enforce basic authorization check
    user_role = (current_user.get("role") or "").upper()
    if user_role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens cannot search users.")
        
    from ..services.assignment_service import search_eligible_assignees
    users = await search_eligible_assignees(current_user, q)
    return users
