import os
import hmac
import hashlib
import json
import requests
from datetime import datetime

# URL of the local webhook endpoint
WEBHOOK_URL = "http://localhost:8000/api/webhooks/meta"
# Test secret - ensure this matches the META_APP_SECRET env var of the running server
TEST_SECRET = os.getenv("META_APP_SECRET", "test_secret_123")

def test_verification():
    """Test the GET verification challenge."""
    print("Testing GET verification...")
    verify_token = os.getenv("META_VERIFY_TOKEN", "test_verify_token")
    params = {
        "hub.mode": "subscribe",
        "hub.verify_token": verify_token,
        "hub.challenge": "1158201444"
    }
    try:
        response = requests.get(WEBHOOK_URL, params=params)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200 and response.text == "1158201444":
            print("✅ Verification passed!\n")
        else:
            print("❌ Verification failed!\n")
    except Exception as e:
        print(f"❌ Verification error: {e}\n")

def test_payload():
    """Test the POST payload processing with signature."""
    print("Testing POST payload processing...")
    
    # Sample Instagram Mentions payload
    payload_data = {
        "object": "instagram",
        "entry": [
            {
                "id": "17841400000000000",
                "time": int(datetime.now().timestamp()),
                "changes": [
                    {
                        "field": "mentions",
                        "value": {
                            "media_id": "17900000000000000",
                            "comment_id": "17800000000000000",
                            "text": "@jannetra Pothole issue here!",
                            "from": {
                                "id": "17841400000000001",
                                "username": "concerned_citizen_99"
                            }
                        }
                    }
                ]
            }
        ]
    }
    
    payload_bytes = json.dumps(payload_data).encode("utf-8")
    
    # Generate signature
    signature = hmac.new(
        key=TEST_SECRET.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": f"sha256={signature}"
    }
    
    try:
        response = requests.post(WEBHOOK_URL, data=payload_bytes, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            print("✅ Payload accepted! (Check server logs to verify DB insert)\n")
        else:
            print("❌ Payload rejected!\n")
    except Exception as e:
        print(f"❌ Payload error: {e}\n")

if __name__ == "__main__":
    print(f"Using Webhook URL: {WEBHOOK_URL}")
    print(f"Using App Secret: {TEST_SECRET}\n")
    test_verification()
    test_payload()
