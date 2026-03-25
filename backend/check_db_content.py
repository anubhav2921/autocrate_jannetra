
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["governance_db"]
    
    articles = await db["news_articles"].count_documents({})
    clusters = await db["signal_problems"].count_documents({})
    users = await db["users"].count_documents({})
    
    print(f"Articles: {articles}")
    print(f"Clusters: {clusters}")
    print(f"Users: {users}")
    
    if articles > 0:
        sample = await db["news_articles"].find_one({})
        print(f"Sample Article: {sample.get('title')}")

if __name__ == "__main__":
    asyncio.run(check_db())
