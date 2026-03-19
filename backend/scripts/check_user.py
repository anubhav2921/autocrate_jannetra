import asyncio
import os
import sys

# Ensure backend root is in path
sys.path.append(os.getcwd())

from app.mongodb import users_collection

async def run():
    u = await users_collection.find_one({"email": "vinu_leader@jannetra.gov.in"})
    print(f"USER_FOUND: {u is not None}")
    if u:
        print(f"USER_DETAILS: {u}")

if __name__ == "__main__":
    asyncio.run(run())
