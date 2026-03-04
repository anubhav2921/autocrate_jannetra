"""
Firebase Admin SDK — one-time initialization.
──────────────────────────────────────────────
Provides an `initialize_firebase()` helper that is safe to call multiple times.
The SDK is configured using the serviceAccountKey.json located alongside this file.
"""

import os
import firebase_admin
from firebase_admin import credentials

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_CRED_PATH = os.path.join(BASE_DIR, "serviceAccountKey.json")


def initialize_firebase():
    """Initialize Firebase Admin SDK (idempotent — safe to call repeatedly)."""
    if not firebase_admin._apps:
        if not os.path.exists(_CRED_PATH):
            raise FileNotFoundError(
                f"serviceAccountKey.json not found at {_CRED_PATH}. "
                "Download it from the Firebase Console → Project Settings → Service Accounts."
            )
        cred = credentials.Certificate(_CRED_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin Initialized Successfully")


# Auto-initialize when this module is first imported
initialize_firebase()