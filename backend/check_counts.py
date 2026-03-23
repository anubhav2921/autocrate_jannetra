
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client['governance_db']
    doc = await db['news_articles'].find_one()
    print("news_articles keys:", doc.keys() if doc else "None")
    
    doc2 = await db['signal_problems'].find_one()
    print("signal_problems keys:", doc2.keys() if doc2 else "None")

if __name__ == "__main__":
    asyncio.run(run())
