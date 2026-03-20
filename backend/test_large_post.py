import asyncio
import httpx
from datetime import datetime

async def test_large_post():
    async with httpx.AsyncClient() as client:
        # Simulate a 3MB base64 string
        fake_image = "data:image/jpeg;base64," + ("A" * 3_000_000)
        payload = {
            "report_id": "JN-112233",
            "image_url": fake_image,
            "detected_issue": "Manual Entry",
            "user_description": "Testing large payload",
            "latitude": 25.0,
            "longitude": 81.0,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {"scene_type": "Other"}
        }
        res = await client.post("http://localhost:8000/api/report-issue/submit", json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:200]}") # Truncated so not flooded if error

if __name__ == "__main__":
    asyncio.run(test_large_post())
