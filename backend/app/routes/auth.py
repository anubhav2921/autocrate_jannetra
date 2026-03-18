import hashlib
import random
import re
import time
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

from ..mongodb import users_collection
from ..services.sms_service import send_otp_sms, send_email_otp
from ..utils import gen_uuid, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEPARTMENTS = ["health", "police", "municipal", "electricity", "water", "education", "transport"]

# In-memory OTP stores
_otp_store: Dict[str, Dict[str, Any]] = {}
_phone_otp_store: Dict[str, Dict[str, Any]] = {}


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


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


@router.post("/signup")
async def signup(req: SignupRequest):
    """Step 1: Validate info and send OTP."""
    existing = await users_collection.find_one({"email": req.email})
    if existing:
        return {"success": False, "error": "Email already registered"}

    otp = str(random.randint(100000, 999999))
    _otp_store[req.email] = {
        "otp": otp,
        "expires": time.time() + 300,
        "signup_data": {
            "name": req.name,
            "email": req.email,
            "password": req.password,
            "role": req.role,
            "department": req.department,
        },
    }

    send_email_otp(req.email, otp)

    return {
        "success": True,
        "otp_sent": True,
        "message": "OTP sent to your email",
        "demo_otp": otp,
    }


@router.post("/verify-otp")
async def verify_otp(req: OTPVerifyRequest):
    """Step 2: Verify OTP and create account."""
    stored = _otp_store.get(req.email)

    if not stored:
        return {"success": False, "error": "No OTP requested for this email. Please sign up again."}

    if time.time() > float(stored["expires"]):
        _otp_store.pop(req.email, None)
        return {"success": False, "error": "OTP has expired. Please sign up again."}

    if str(stored["otp"]) != req.otp:
        return {"success": False, "error": "Invalid OTP. Please try again."}

    data = stored["signup_data"]
    user_doc = {
        "id": gen_uuid(),
        "name": str(data["name"]),
        "email": str(data["email"]),
        "password_hash": _hash_password(str(data["password"])),
        "role": str(data.get("role", "LEADER")),
        "department": str(data.get("department", "")),
        "is_active": True,
        "auth_provider": "email",
        "created_at": datetime.utcnow(),
    }
    await users_collection.insert_one(user_doc)
    _otp_store.pop(req.email, None)
    
    # Create JWT token
    token = create_access_token(data={"user_id": user_doc["id"], "department": user_doc["department"]})

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_doc["id"],
            "name": user_doc["name"],
            "email": user_doc["email"],
            "role": user_doc["role"],
            "department": user_doc["department"],
            "picture": user_doc.get("picture"),
            "auth_provider": user_doc["auth_provider"],
        },
    }


@router.post("/login")
async def login(req: LoginRequest):
    user = await users_collection.find_one({"email": req.email})
    if not user:
        return {"success": False, "error": "Invalid email or password"}

    if user.get("auth_provider") == "google":
        return {"success": False, "error": "This account uses Google Sign-In. Please use the 'Continue with Google' button."}

    if user.get("password_hash") != _hash_password(req.password):
        return {"success": False, "error": "Invalid email or password"}

    if not user.get("is_active", True):
        return {"success": False, "error": "Account is deactivated"}

    token = create_access_token(data={"user_id": user["id"], "department": user.get("department", "")})

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role"),
            "department": user.get("department"),
            "picture": user.get("picture"),
            "auth_provider": user.get("auth_provider"),
        },
    }


@router.post("/google")
async def google_auth(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = auth_header.split(" ", 1)[1]

    try:
        from firebase_admin import auth as firebase_auth
        from ..firebase_admin_config import initialize_firebase
        initialize_firebase()
        decoded_token = firebase_auth.verify_id_token(token)
    except ImportError:
        raise HTTPException(status_code=500, detail="firebase-admin package not installed.")
    except Exception as e:
        error_msg = str(e)
        print(f"[AUTH] Firebase token verification failed: {error_msg}")
        if "serviceAccountKey.json" in error_msg or "FileNotFoundError" in error_msg:
            raise HTTPException(status_code=500, detail="Firebase Admin not configured.")
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")

    uid = decoded_token["uid"]
    email = decoded_token.get("email", "")
    name = decoded_token.get("name", email.split("@")[0] if email else "User")
    picture = decoded_token.get("picture", "")

    user = await users_collection.find_one({"google_uid": uid})
    if not user and email:
        user = await users_collection.find_one({"email": email})

    if user:
        await users_collection.update_one(
            {"id": user["id"]},
            {"$set": {"google_uid": uid, "picture": picture, "auth_provider": "google"}}
        )
        user["google_uid"] = uid
        user["picture"] = picture
        user["auth_provider"] = "google"
    else:
        user = {
            "id": gen_uuid(),
            "name": name,
            "email": email,
            "password_hash": "",
            "role": "LEADER",
            "department": "", # Default empty
            "google_uid": uid,
            "picture": picture,
            "auth_provider": "google",
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(user)

    token = create_access_token(data={"user_id": user["id"], "department": user.get("department", "")})

    return {
        "message": "Authentication successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role"),
            "department": user.get("department"),
            "picture": user.get("picture"),
            "auth_provider": user.get("auth_provider"),
        },
    }



@router.post("/firebase-login")
async def firebase_phone_login(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = auth_header.split(" ", 1)[1]

    try:
        from firebase_admin import auth as firebase_auth
        from ..firebase_admin_config import initialize_firebase
        initialize_firebase()
        decoded_token = firebase_auth.verify_id_token(token)
    except ImportError:
        raise HTTPException(status_code=500, detail="firebase-admin package not installed.")
    except Exception as e:
        print(f"[AUTH] Firebase token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")

    uid = decoded_token["uid"]
    phone_number = decoded_token.get("phone_number", "")
    email = decoded_token.get("email", "")
    name = decoded_token.get("name", "")

    if not phone_number and not email:
        raise HTTPException(status_code=400, detail="Token does not contain a phone number or email.")

    user = await users_collection.find_one({"firebase_uid": uid})
    if not user and phone_number:
        user = await users_collection.find_one({"phone_number": phone_number})
    if not user and email:
        user = await users_collection.find_one({"email": email})

    if user:
        update = {"firebase_uid": uid}
        if phone_number:
            update["phone_number"] = phone_number
        if not user.get("auth_provider") or user.get("auth_provider") == "email":
            update["auth_provider"] = "phone"
        await users_collection.update_one({"id": user["id"]}, {"$set": update})
        user.update(update)
        print(f"[AUTH] Firebase phone login: existing user {phone_number or email}")
    else:
        display_name = name or (f"User {phone_number[-4:]}" if phone_number else "User")
        user = {
            "id": gen_uuid(),
            "name": display_name,
            "email": email or None,
            "password_hash": "",
            "role": "LEADER",
            "department": "",
            "firebase_uid": uid,
            "phone_number": phone_number or None,
            "auth_provider": "phone",
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(user)
        print(f"[AUTH] Firebase phone login: new user created for {phone_number}")

    token = create_access_token(data={"user_id": user["id"], "department": user.get("department", "")})

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email") or "",
            "phone_number": user.get("phone_number") or "",
            "role": user.get("role"),
            "department": user.get("department"),
            "picture": user.get("picture") or "",
            "auth_provider": user.get("auth_provider"),
        },
    }



class PhoneOTPRequest(BaseModel):
    phone_number: str
    name: Optional[str] = None


class PhoneOTPVerify(BaseModel):
    phone_number: str
    otp: str
    name: Optional[str] = None


def _validate_phone(phone: str) -> str:
    cleaned = re.sub(r"\s+", "", phone)
    if not re.match(r"^\+[1-9]\d{7,14}$", cleaned):
        raise HTTPException(status_code=400, detail="Invalid phone number. Use E.164 format (e.g. +919876543210).")
    return cleaned


@router.post("/send-phone-otp")
def send_phone_otp(req: PhoneOTPRequest):
    phone = _validate_phone(req.phone_number or "")
    otp = str(random.randint(100000, 999999))
    _phone_otp_store[phone] = {
        "otp": otp,
        "expires": time.time() + 300,
        "name": req.name or "",
    }
    send_otp_sms(phone, otp)
    return {"success": True, "message": f"OTP sent to {phone}", "demo_otp": otp}


@router.post("/register-phone")
async def register_phone(req: PhoneOTPVerify):
    phone = _validate_phone(req.phone_number)
    stored = _phone_otp_store.get(phone)
    if not stored:
        return {"success": False, "error": "No OTP requested for this phone number."}
    if time.time() > float(stored["expires"]):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "OTP has expired."}
    if str(stored["otp"]) != req.otp:
        return {"success": False, "error": "Invalid OTP."}

    existing = await users_collection.find_one({"phone_number": phone})
    if existing:
        _phone_otp_store.pop(phone, None)
        token = create_access_token(data={"user_id": existing["id"], "department": existing.get("department", "")})
        return {
            "success": True,
            "message": "Phone number already registered. Logged in.",
            "token": token,
            "user": {
                "id": existing["id"],
                "name": existing["name"],
                "email": existing.get("email") or "",
                "phone_number": existing.get("phone_number") or "",
                "role": existing.get("role"),
                "department": existing.get("department") or "",
                "picture": existing.get("picture") or "",
                "auth_provider": existing.get("auth_provider"),
            },
        }


    phone_str = str(phone)
    phone_suffix = phone_str[-4:] if len(phone_str) >= 4 else "0000"
    display_name = req.name or stored.get("name") or f"User {phone_suffix}"
    user = {
        "id": gen_uuid(),
        "name": display_name,
        "email": None,
        "password_hash": "",
        "role": "LEADER",
        "department": "",
        "phone_number": phone,
        "auth_provider": "phone",
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await users_collection.insert_one(user)
    _phone_otp_store.pop(phone, None)
    token = create_access_token(data={"user_id": user["id"], "department": user.get("department", "")})

    return {
        "success": True,
        "message": "Registration successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email") or "",
            "phone_number": user.get("phone_number") or "",
            "role": user.get("role"),
            "department": user.get("department") or "",
            "picture": user.get("picture") or "",
            "auth_provider": user.get("auth_provider"),
        },
    }



@router.post("/login-phone")
async def login_phone(req: PhoneOTPVerify):
    phone = _validate_phone(req.phone_number)
    stored = _phone_otp_store.get(phone)
    if not stored:
        return {"success": False, "error": "No OTP requested for this phone number."}
    if time.time() > float(stored["expires"]):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "OTP has expired."}
    if str(stored["otp"]) != req.otp:
        return {"success": False, "error": "Invalid OTP."}

    user = await users_collection.find_one({"phone_number": phone})
    if not user:
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "No account found with this phone number."}

    if not user.get("is_active", True):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "Account is deactivated."}

    _phone_otp_store.pop(phone, None)
    token = create_access_token(data={"user_id": user["id"], "department": user.get("department", "")})
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email") or "",
            "phone_number": user.get("phone_number") or "",
            "role": user.get("role"),
            "department": user.get("department") or "",
            "picture": user.get("picture") or "",
            "auth_provider": user.get("auth_provider"),
        },
    }



class CreateUserRequest(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    firebase_uid: Optional[str] = ""


@router.post("/users/create")
async def create_user_profile(req: CreateUserRequest):
    def clean_str(val: Any) -> str:
        if val is None: return ""
        return str(val).strip()

    email = clean_str(req.email)
    phone_number = clean_str(req.phone)
    firebase_uid = clean_str(req.firebase_uid)
    name = clean_str(req.name)

    if not email and not phone_number:
        return {"success": False, "error": "At least one of email or phone must be provided."}
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
        update = {}
        if firebase_uid and not user.get("firebase_uid"):
            update["firebase_uid"] = firebase_uid
        if email and not user.get("email"):
            update["email"] = email
        if phone_number and not user.get("phone_number"):
            update["phone_number"] = phone_number
        if name:
            update["name"] = name
        if update:
            await users_collection.update_one({"id": user["id"]}, {"$set": update})
            user.update(update)
        print(f"[AUTH] User profile updated for {email or phone_number}")
    else:
        auth_provider = "email" if email else "phone"
        user = {
            "id": gen_uuid(),
            "name": name,
            "email": email or None,
            "phone_number": phone_number or None,
            "password_hash": "",
            "role": "LEADER",
            "department": "",
            "firebase_uid": firebase_uid or None,
            "auth_provider": auth_provider,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        await users_collection.insert_one(user)
        print(f"[AUTH] New user profile created for {email or phone_number}")

    # Create token for the user profile
    token = create_access_token(data={"user_id": user["id"], "department": user.get("department", "")})

    return {
        "success": True,
        "message": "User profile created successfully",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email") or "",
            "phone_number": user.get("phone_number") or "",
            "role": user.get("role"),
            "department": user.get("department") or "",
            "picture": user.get("picture") or "",
            "auth_provider": user.get("auth_provider"),
            "firebase_uid": user.get("firebase_uid") or "",
        },
    }
