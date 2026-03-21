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

    if not firebase_json:
        logger.warning(
            "[Firebase] FIREBASE_SERVICE_ACCOUNT not set — "
            "Firebase Admin SDK will NOT be initialized. "
            "Auth routes will be unavailable. "
            "This is expected in local development."
        )
        return  # Graceful skip instead of raising

    try:
        cred_dict = json.loads(firebase_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        logger.info("[Firebase] Admin SDK initialized successfully.")
    except Exception as exc:
        logger.error("[Firebase] Failed to initialize Admin SDK: %s", exc)
        # Don't crash — let the server start; auth routes will fail gracefully


initialize_firebase()