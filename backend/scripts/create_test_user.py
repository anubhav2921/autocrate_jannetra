import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def create_user():
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(uri)
    db = client["jannetra_new"]
    users_collection = db["users_collection"]
    
    test_user = {
        "full_name": "Vinu Leader",
        "email": "vinu_leader@jannetra.gov.in",
        "password": "vinu123", # Note: Frontend sends plain text, backend should hash, but for mock test drive simple is fine if backend doesn't hash
        "role": "Leader",
        "phone": "+919876543210",
        "auth_provider": "Email",
        "is_verified": True
    }
    
    await users_collection.update_one(
        {"email": test_user["email"]},
        {"$set": test_user},
        upsert=True
    )
    print(f"User {test_user['email']} created or updated.")

if __name__ == "__main__":
    asyncio.run(create_user())
