import os
import json
import logging
import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger(__name__)

def initialize_firebase():
    """
    Initialize Firebase Admin SDK.
    On Railway (production) the FIREBASE_SERVICE_ACCOUNT env var is set as JSON.
    In local development it is optional — the server will start without Firebase
    (auth-dependent routes will return 503 instead of crashing the whole process).
    """
    if firebase_admin._apps:
        return  # Already initialized

    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    
    # Try to find serviceAccountKey.json in the current directory if env var is missing
    service_account_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

    if not firebase_json and os.path.exists(service_account_path):
        try:
            with open(service_account_path, "r") as f:
                firebase_json = f.read()
            logger.info("[Firebase] Found service account key file at %s", service_account_path)
        except Exception as e:
            logger.error("[Firebase] Error reading service account file: %s", e)

    if not firebase_json:
        logger.warning(
            "[Firebase] FIREBASE_SERVICE_ACCOUNT not set and serviceAccountKey.json not found — "
            "Firebase Admin SDK will NOT be initialized. "
            "Auth routes will be unavailable."
        )
        return

    try:
        # If it's already a dict (from json.loads) vs a string
        if isinstance(firebase_json, str):
            cred_dict = json.loads(firebase_json)
        else:
            cred_dict = firebase_json
            
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        logger.info("[Firebase] Admin SDK initialized successfully.")
    except Exception as exc:
        logger.error("[Firebase] Failed to initialize Admin SDK: %s", exc)
        # Don't crash — let the server start; auth routes will fail gracefully


initialize_firebase()