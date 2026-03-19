from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
mongo_db_name = os.getenv("MONGO_DB_NAME", "governance_db")
client = MongoClient(mongo_url)
db = client[mongo_db_name]
collection = db["news_articles"]

print("--- City Distribution ---")
pipeline = [
    {"$group": {"_id": "$city", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]
for r in collection.aggregate(pipeline):
    print(f"{r['_id']}: {r['count']}")
client.close()
