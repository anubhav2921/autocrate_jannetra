
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def cleanup():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["governance_db"]
    collection = db["signal_problems"]
    
    result = await collection.update_many(
        {"status": "Resolved"},
        {"$set": {"status": "Problem Resolved"}}
    )
    print(f"Updated {result.modified_count} documents from 'Resolved' to 'Problem Resolved'.")
    
    result_news = await db["news_articles"].update_many(
        {"status": "Resolved"},
        {"$set": {"status": "Problem Resolved"}}
    )
    print(f"Updated {result_news.modified_count} news articles from 'Resolved' to 'Problem Resolved'.")

if __name__ == "__main__":
    asyncio.run(cleanup())
