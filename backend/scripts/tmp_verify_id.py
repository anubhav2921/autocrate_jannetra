from pymongo import MongoClient
import os
from bson import ObjectId

mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
db_name = os.getenv("MONGO_DB_NAME", "governance_db")
client = MongoClient(mongo_url)
db = client[db_name]

# Find article like the one in screenshot
art = db['news_articles'].find_one({"title": {"$regex": "UAE arrested 35 people", "$options": "i"}})
if art:
    print(f"FOUND: {art['title']}")
    print(f"_id: {art['_id']}")
    suffix = str(art['_id'])[-6:].upper()
    print(f"SYNTH_ID: SIG-{suffix}")
else:
    print("Article not found by regex.")

client.close()
