import asyncio
import httpx

async def test_get():
    async with httpx.AsyncClient() as client:
        res = await client.get("http://localhost:8000/api/report/JN-999999")
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")

        res2 = await client.get("http://localhost:8000/api/report/JN-671840")
        print(f"Status 2: {res2.status_code}")
        print(f"Response 2: {res2.text}")

if __name__ == "__main__":
    asyncio.run(test_get())
