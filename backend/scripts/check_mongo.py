from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
mongo_db_name = os.getenv("MONGO_DB_NAME", "governance_db")
client = MongoClient(mongo_url)
db = client[mongo_db_name]
collection = db["news_articles"]

print("--- MongoDB Status ---")
total = collection.count_documents({})
print(f"Total News Articles: {total}")

with_city = collection.count_documents({"city": {"$not": {"$in": [None, "India", "generic"]}}})
print(f"Articles with specific City: {with_city}")

with_coords = collection.count_documents({"latitude": {"$ne": None}})
print(f"Articles with Coordinates: {with_coords}")

sample = collection.find_one({"city": {"$ne": None}})
if sample:
    print(f"Sample: {sample.get('title')} -> {sample.get('city')} ({sample.get('latitude')}, {sample.get('longitude')})")

client.close()
