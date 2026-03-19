import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_users():
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client.get_database()
    
    users = await db["users"].find({}).to_list(None)
    for u in users:
        print(f"User ID: {u.get('id')}, Name: {u.get('name')}, Role: {u.get('role')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
