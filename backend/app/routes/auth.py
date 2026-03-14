import hashlib
import random
import re
import time
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..database import get_db
from ..models import User
from ..services.sms_service import send_otp_sms, send_email_otp

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory OTP store: { email: { otp, expires, signup_data } }
_otp_store: Dict[str, Dict[str, Any]] = {}

# In-memory Phone OTP store: { phone_number: { otp, expires, name? } }
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
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Step 1: Validate info and send OTP."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        return {"success": False, "error": "Email already registered"}

    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    _otp_store[req.email] = {
        "otp": otp,
        "expires": time.time() + 300,  # 5 min expiry
        "signup_data": {
            "name": req.name,
            "email": req.email,
            "password": req.password,
            "role": req.role,
            "department": req.department,
        },
    }

    # Send OTP via email service (console fallback in dev)
    send_email_otp(req.email, otp)

    return {
        "success": True,
        "otp_sent": True,
        "message": "OTP sent to your email",
        # demo_otp included for development — remove before production
        "demo_otp": otp,
    }


@router.post("/verify-otp")
def verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Step 2: Verify OTP and create account."""
    stored = _otp_store.get(req.email)

    if not stored:
        return {"success": False, "error": "No OTP requested for this email. Please sign up again."}

    if time.time() > float(stored["expires"]):
        _otp_store.pop(req.email, None)
        return {"success": False, "error": "OTP has expired. Please sign up again."}

    if str(stored["otp"]) != req.otp:
        return {"success": False, "error": "Invalid OTP. Please try again."}

    # OTP verified — create the user
    data = stored["signup_data"]
    user = User(
        name=str(data["name"]),
        email=str(data["email"]),
        password_hash=_hash_password(str(data["password"])),
        role=str(data.get("role", "LEADER")),
        department=str(data.get("department", "")),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Clean up OTP
    _otp_store.pop(req.email, None)
    print(f"[AUTH] User {data.get('email', 'unknown')} registered successfully")

    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "picture": user.picture,
            "auth_provider": user.auth_provider,
        },
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        return {"success": False, "error": "Invalid email or password"}

    # Google-only accounts have no password
    if user.auth_provider == "google":
        return {"success": False, "error": "This account uses Google Sign-In. Please use the 'Continue with Google' button."}

    if user.password_hash != _hash_password(req.password):
        return {"success": False, "error": "Invalid email or password"}

    if not user.is_active:
        return {"success": False, "error": "Account is deactivated"}

    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "picture": user.picture,
            "auth_provider": user.auth_provider,
        },
    }


# 
#  Google OAuth — Firebase ID Token Verification
# 

@router.post("/google")
async def google_auth(request: Request, db: Session = Depends(get_db)):
    """
    Verify a Firebase ID token sent from the frontend after Google Sign-In.
    Creates a new user record if this is the first login, or returns the
    existing user if already registered.

    Expected header:  Authorization: Bearer <firebase-id-token>
    """
    # 1. Extract the Bearer token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = auth_header.split(" ", 1)[1]

    # 2. Verify token with Firebase Admin SDK
    try:
        # Import here so the app doesn't break if firebase-admin isn't installed
        from firebase_admin import auth as firebase_auth
        from ..firebase_admin_config import initialize_firebase
        initialize_firebase()

        decoded_token = firebase_auth.verify_id_token(token)
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="firebase-admin package not installed. Run: pip install firebase-admin"
        )
    except Exception as e:
        error_msg = str(e)
        print(f"[AUTH] Firebase token verification failed: {error_msg}")

        if "serviceAccountKey.json" in error_msg or "FileNotFoundError" in error_msg:
            raise HTTPException(
                status_code=500,
                detail="Firebase Admin not configured. Please add serviceAccountKey.json to the backend folder."
            )
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")

    # 3. Extract user info from the decoded token
    uid     = decoded_token["uid"]
    email   = decoded_token.get("email", "")
    name    = decoded_token.get("name", email.split("@")[0] if email else "User")
    picture = decoded_token.get("picture", "")

    # 4. Look up existing user by Google UID or email
    user = db.query(User).filter(User.google_uid == uid).first()

    if not user and email:
        # Check if email exists from a regular signup
        user = db.query(User).filter(User.email == email).first()

    if user:
        # Update picture and Google UID in case they changed or were missing
        user.google_uid    = uid
        user.picture       = picture
        user.auth_provider = "google"
        db.commit()
        db.refresh(user)
        print(f"[AUTH] Google login: existing user {email}")
    else:
        # 5. First-time Google login — create account automatically
        user = User(
            name=name,
            email=email,
            password_hash="",       # Google users don't have a password
            role="LEADER",          # Default role — change in DB as needed
            department="",
            google_uid=uid,
            picture=picture,
            auth_provider="google",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[AUTH] Google login: new user created for {email}")

    return {
        "message": "Authentication successful",
        "user": {
            "id":            user.id,
            "name":          user.name,
            "email":         user.email,
            "role":          user.role,
            "department":    user.department,
            "picture":       user.picture,
            "auth_provider": user.auth_provider,
        },
    }


# 
#  Phone OTP — Firebase ID Token Verification
# 

@router.post("/firebase-login")
async def firebase_phone_login(request: Request, db: Session = Depends(get_db)):
    """
    Verify a Firebase ID token sent from the frontend after Phone OTP Sign-In.
    Creates a new user record if this is the first login, or returns the
    existing user if already registered.

    Expected header:  Authorization: Bearer <firebase-id-token>
    """
    # 1. Extract the Bearer token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = auth_header.split(" ", 1)[1]

    # 2. Verify token with Firebase Admin SDK
    try:
        from firebase_admin import auth as firebase_auth
        from ..firebase_admin_config import initialize_firebase
        initialize_firebase()

        decoded_token = firebase_auth.verify_id_token(token)
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="firebase-admin package not installed. Run: pip install firebase-admin",
        )
    except Exception as e:
        error_msg = str(e)
        print(f"[AUTH] Firebase token verification failed: {error_msg}")
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")

    # 3. Extract user info from the TRUSTED decoded token
    uid = decoded_token["uid"]
    phone_number = decoded_token.get("phone_number", "")   # Always trust server-side
    email = decoded_token.get("email", "")
    name = decoded_token.get("name", "")

    if not phone_number and not email:
        raise HTTPException(
            status_code=400,
            detail="Token does not contain a phone number or email.",
        )

    # 4. Look up existing user by firebase_uid, phone_number, or email
    user = db.query(User).filter(User.firebase_uid == uid).first()

    if not user and phone_number:
        user = db.query(User).filter(User.phone_number == phone_number).first()

    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if user:
        # Update canonical fields
        user.firebase_uid = uid
        if phone_number:
            user.phone_number = phone_number
        if not user.auth_provider or user.auth_provider == "email":
            user.auth_provider = "phone"
        db.commit()
        db.refresh(user)
        print(f"[AUTH] Firebase phone login: existing user {phone_number or email}")
    else:
        # 5. First-time phone login — create account automatically
        display_name = name or (f"User {phone_number[-4:]}" if phone_number else "User")
        user = User(
            name=display_name,
            email=email or None,              # None if phone-only
            password_hash="",                 # Phone users don't have a password
            role="LEADER",                    # Default role
            department="",
            firebase_uid=uid,
            phone_number=phone_number or None,
            auth_provider="phone",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[AUTH] Firebase phone login: new user created for {phone_number}")

    return {
        "message": "Login successful",
        "user": {
            "id":            user.id,
            "name":          user.name,
            "email":         user.email or "",
            "phone_number":  user.phone_number or "",
            "role":          user.role,
            "department":    user.department,
            "picture":       user.picture or "",
            "auth_provider": user.auth_provider,
        },
    }


# 
#  Backend-Managed Phone OTP (no Firebase billing required)
# 

class PhoneOTPRequest(BaseModel):
    phone_number: str
    name: Optional[str] = None       # only used during registration


class PhoneOTPVerify(BaseModel):
    phone_number: str
    otp: str
    name: Optional[str] = None       # only used during registration


def _validate_phone(phone: str) -> str:
    """Validate and normalize E.164 phone number. Returns cleaned number."""
    cleaned = re.sub(r"\s+", "", phone)
    if not re.match(r"^\+[1-9]\d{7,14}$", cleaned):
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number. Use E.164 format (e.g. +919876543210).",
        )
    return cleaned


@router.post("/send-phone-otp")
def send_phone_otp(req: PhoneOTPRequest):
    """
    Generate a 6-digit OTP for the given phone number.
    In production: integrate with an SMS gateway (Twilio, AWS SNS, MSG91).
    In development: OTP is printed to the backend console.
    """
    phone_input = req.phone_number or ""
    phone = _validate_phone(phone_input)

    otp = str(random.randint(100000, 999999))
    _phone_otp_store[phone] = {
        "otp": otp,
        "expires": time.time() + 300,   # 5 min expiry
        "name": req.name or "",
    }

    # Send OTP via SMS service (Twilio in production, console in dev)
    send_otp_sms(phone, otp)

    return {
        "success": True,
        "message": f"OTP sent to {phone}",
        # NOTE: demo_otp is included ONLY for development; remove before production
        "demo_otp": otp,
    }


@router.post("/register-phone")
def register_phone(req: PhoneOTPVerify, db: Session = Depends(get_db)):
    """
    Step 1: Verify OTP
    Step 2: Create a new user with phone_number as primary identity.
    Returns the created user profile.
    """
    phone = _validate_phone(req.phone_number)

    # 1. Verify OTP
    stored = _phone_otp_store.get(phone)
    if not stored:
        return {"success": False, "error": "No OTP requested for this phone number. Please request a new OTP."}

    if time.time() > float(stored["expires"]):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "OTP has expired. Please request a new one."}

    if str(stored["otp"]) != req.otp:
        return {"success": False, "error": "Invalid OTP. Please try again."}

    # 2. Check if phone number is already registered
    existing = db.query(User).filter(User.phone_number == phone).first()
    if existing:
        # Clean up OTP and return existing user (act as login)
        _phone_otp_store.pop(phone, None)
        return {
            "success": True,
            "message": "Phone number already registered. Logged in.",
            "user": {
                "id":            existing.id,
                "name":          existing.name,
                "email":         existing.email or "",
                "phone_number":  existing.phone_number or "",
                "role":          existing.role,
                "department":    existing.department or "",
                "picture":       existing.picture or "",
                "auth_provider": existing.auth_provider,
            },
        }

    # 3. Create new user
    phone_str = str(phone)
    phone_suffix = phone_str[len(phone_str) - 4:] if len(phone_str) >= 4 else "0000"
    default_name = f"User {phone_suffix}"
    display_name = req.name or stored.get("name") or default_name
    user = User(
        name=display_name,
        email=None,
        password_hash="",
        role="LEADER",
        department="",
        phone_number=phone,
        auth_provider="phone",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 4. Clean up OTP
    _phone_otp_store.pop(phone, None)
    print(f"[AUTH] Phone registration: new user created for {phone}")

    return {
        "success": True,
        "message": "Registration successful",
        "user": {
            "id":            user.id,
            "name":          user.name,
            "email":         user.email or "",
            "phone_number":  user.phone_number or "",
            "role":          user.role,
            "department":    user.department or "",
            "picture":       user.picture or "",
            "auth_provider": user.auth_provider,
        },
    }


@router.post("/login-phone")
def login_phone(req: PhoneOTPVerify, db: Session = Depends(get_db)):
    """
    Step 1: Verify OTP
    Step 2: Look up existing user by phone number.
    Returns user profile if found.
    """
    phone = _validate_phone(req.phone_number)

    # 1. Verify OTP
    stored = _phone_otp_store.get(phone)
    if not stored:
        return {"success": False, "error": "No OTP requested for this phone number. Please request a new OTP."}

    if time.time() > float(stored["expires"]):
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "OTP has expired. Please request a new one."}

    if str(stored["otp"]) != req.otp:
        return {"success": False, "error": "Invalid OTP. Please try again."}

    # 2. Look up user
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        _phone_otp_store.pop(phone, None)
        return {
            "success": False,
            "error": "No account found with this phone number. Please register first.",
        }

    if not user.is_active:
        _phone_otp_store.pop(phone, None)
        return {"success": False, "error": "Account is deactivated."}

    # 3. Clean up OTP
    _phone_otp_store.pop(phone, None)
    print(f"[AUTH] Phone login: {phone}")

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id":            user.id,
            "name":          user.name,
            "email":         user.email or "",
            "phone_number":  user.phone_number or "",
            "role":          user.role,
            "department":    user.department or "",
            "picture":       user.picture or "",
            "auth_provider": user.auth_provider,
        },
    }


# 
#  User Profile Creation (Firebase-based signup)
# 

class CreateUserRequest(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    firebase_uid: Optional[str] = ""


@router.post("/users/create")
def create_user_profile(req: CreateUserRequest, db: Session = Depends(get_db)):
    """
    Create or update a user profile after Firebase authentication.
    At least one of email or phone must be provided.

    POST /api/users/create
    Payload: { name, email, phone, firebase_uid }
    """
    # Normalize inputs
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

    # Check if user already exists by firebase_uid, email, or phone
    user = None

    if firebase_uid:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if not user and phone_number:
        user = db.query(User).filter(User.phone_number == phone_number).first()

    if user:
        # Update existing user with any new info
        if firebase_uid and not user.firebase_uid:
            user.firebase_uid = firebase_uid
        if email and not user.email:
            user.email = email
        if phone_number and not user.phone_number:
            user.phone_number = phone_number
        if name:
            user.name = name
        db.commit()
        db.refresh(user)
        print(f"[AUTH] User profile updated for {email or phone_number}")
    else:
        # Determine auth_provider
        auth_provider = "email" if email else "phone"

        user = User(
            name=name,
            email=email or None,
            phone_number=phone_number or None,
            password_hash="",
            role="LEADER",
            department="",
            firebase_uid=firebase_uid or None,
            auth_provider=auth_provider,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[AUTH] New user profile created for {email or phone_number}")

    return {
        "success": True,
        "message": "User profile created successfully",
        "user": {
            "id":            user.id,
            "name":          user.name,
            "email":         user.email or "",
            "phone_number":  user.phone_number or "",
            "role":          user.role,
            "department":    user.department or "",
            "picture":       user.picture or "",
            "auth_provider": user.auth_provider,
            "firebase_uid":  user.firebase_uid or "",
        },
    }


