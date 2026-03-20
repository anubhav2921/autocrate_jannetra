import asyncio
import httpx
from datetime import datetime

async def test_api():
    async with httpx.AsyncClient() as client:
        payload = {
            "report_id": "JN-999999",
            "image_url": "data:image/jpeg;base64,123",
            "detected_issue": "Manual Entry",
            "user_description": "Testing the API",
            "latitude": 25.0,
            "longitude": 81.0,
            "timestamp": datetime.utcnow().isoformat(),
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
    asyncio.run(test_api())
