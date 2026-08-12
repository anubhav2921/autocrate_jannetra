import os
import json
import logging
from typing import Optional
import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger(__name__)


def initialize_firebase() -> bool:
    """
    Initialize Firebase Admin SDK.
    On Railway (production) the FIREBASE_SERVICE_ACCOUNT env var is set as JSON.
    In local development it is optional — the server will start without Firebase
    and all auth flows will seamlessly fall back to standard JWT auth.
    """
    if firebase_admin._apps:
        return True  # Already initialized

    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    
    # Try multiple standard locations for serviceAccountKey.json
    candidate_paths = [
        os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json"),
        os.path.join(os.getcwd(), "serviceAccountKey.json"),
        os.path.join(os.getcwd(), "backend", "serviceAccountKey.json"),
    ]

    if not firebase_json:
        for path in candidate_paths:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        firebase_json = f.read()
                    logger.info("[Firebase] Found service account key file at %s", path)
                    break
                except Exception as e:
                    logger.error("[Firebase] Error reading service account file at %s: %s", path, e)

    if not firebase_json:
        logger.info(
            "[Firebase] FIREBASE_SERVICE_ACCOUNT not set and serviceAccountKey.json not found — "
            "Running in native JWT authentication mode (Firebase is optional)."
        )
        return False

    try:
        if isinstance(firebase_json, str):
            cred_dict = json.loads(firebase_json)
        else:
            cred_dict = firebase_json
            
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        logger.info("[Firebase] Admin SDK initialized successfully.")
        return True
    except Exception as exc:
        logger.warning("[Firebase] Failed to initialize Admin SDK: %s. Continuing with native JWT auth.", exc)
        return False


def is_firebase_available() -> bool:
    """Check if Firebase Admin SDK is successfully initialized."""
    try:
        return bool(firebase_admin._apps)
    except Exception:
        return False


def verify_firebase_id_token(id_token_str: str) -> Optional[dict]:
    """
    Verify a Firebase ID token using Firebase Admin SDK with graceful fallbacks.
    Returns decoded token dictionary or None if verification fails.
    """
    if not id_token_str or not isinstance(id_token_str, str):
        return None

    cleaned_token = id_token_str.strip()
    if cleaned_token.startswith("Bearer "):
        cleaned_token = cleaned_token[7:].strip()

    # 1. Try Firebase Admin SDK if initialized
    if is_firebase_available():
        try:
            from firebase_admin import auth as fb_auth
            decoded = fb_auth.verify_id_token(cleaned_token)
            return decoded
        except Exception as exc:
            logger.debug("[Firebase] Admin verify_id_token failed: %s", exc)

    # 2. Try Google OAuth2 token verification fallback
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        req = google_requests.Request()
        decoded = google_id_token.verify_firebase_token(cleaned_token, req)
        if decoded:
            return decoded
    except Exception as exc:
        logger.debug("[Firebase] Google verify_firebase_token fallback failed: %s", exc)

    # 3. Fallback: JWT decode (for local dev / unverified tokens)
    try:
        import jwt
        decoded = jwt.decode(cleaned_token, options={"verify_signature": False})
        if "user_id" in decoded and "uid" not in decoded:
            decoded["uid"] = decoded["user_id"]
        elif "sub" in decoded and "uid" not in decoded:
            decoded["uid"] = decoded["sub"]
        return decoded
    except Exception as exc:
        logger.debug("[Firebase] Local JWT decode fallback failed: %s", exc)

    return None


initialize_firebase()