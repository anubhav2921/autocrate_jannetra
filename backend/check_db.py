import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.getenv("MONGO_DB_NAME", "jannetra")]
    
    articles = await db.articles.find({"id": {"$regex": "^JN-"}}).to_list(10)
    print("Found articles:", [a["id"] for a in articles])
    
    signal_probs = await db.signal_problems.find({"id": {"$regex": "^JN-"}}).to_list(10)
    print("Found signal problems:", [s["id"] for s in signal_probs])

if __name__ == "__main__":
    asyncio.run(check_db())
