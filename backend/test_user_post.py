import asyncio
import httpx
from datetime import datetime

async def test_user_post():
    async with httpx.AsyncClient() as client:
        payload = {
            "report_id": "JN-671840",
            "image_url": "data:image/jpeg;base64,123", # valid string
            "detected_issue": "Analysis Service Unavailable",
            "user_description": "this is not",
            "latitude": 25.38943,
            "longitude": 81.86702,
            "timestamp": "2026-03-20T13:59:50.000Z",
            "metadata": {
                "detected_issue": "Manual Entry",
                "ai_description": "Analysis was unavailable. Please describe the situation manually.",
                "severity": "None",
                "urgency": "None",
                "confidence": 0,
                "scene_type": "Other"
            }
        }
        res = await client.post("http://localhost:8000/api/report-issue/submit", json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_user_post())
