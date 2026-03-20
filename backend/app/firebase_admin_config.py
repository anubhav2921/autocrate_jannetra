import os
import json
import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if not firebase_admin._apps:

        firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")

        # ✅ PRODUCTION (Railway)
        if firebase_json:
            try:
                cred_dict = json.loads(firebase_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("✅ Firebase initialized from ENV")
                return
            except Exception as e:
                print("❌ ENV Firebase error:", e)

        # ✅ LOCAL (fallback)
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(BASE_DIR, "serviceAccountKey.json")

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized from file")
        else:
            print("❌ Firebase Admin not configured")


# auto init
initialize_firebase()