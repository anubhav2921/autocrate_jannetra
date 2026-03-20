import os
import json
import firebase_admin
from firebase_admin import credentials

if not firebase_admin._apps:
    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")

    print("ENV FOUND:", bool(firebase_json))  # debug

    if firebase_json:
        try:
            cred_dict = json.loads(firebase_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized from ENV")
        except Exception as e:
            print("❌ Firebase error:", e)
    else:
        print("❌ Firebase Admin not configured")