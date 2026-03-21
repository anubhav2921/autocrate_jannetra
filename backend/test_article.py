from app.mongodb import news_articles_collection
from app.services.gemini_service import summarize_news_article
import asyncio

async def test_update():
    a = await news_articles_collection.find_one({"id": "455426d7-1e61-4e48-86a0-583f4acf8263"})
    if not a:
        print("Article not found in DB")
        return
    print(f"Article: {a.get('title')}")
    print(f"Content length: {len(a.get('content', ''))}")
    print(f"Has Gemini Summary: {a.get('has_gemini_summary')}")
    
    loc_parts = [x for x in [a.get("city"), a.get("district"), a.get("state")] if x]
    location_str = ", ".join(loc_parts) if loc_parts else (a.get("source_name") or "Unknown")

    summary = summarize_news_article(
        title=a.get("title", ""),
        category=a.get("category", "General"),
        location=location_str,
        content=a.get("content", "")
    )
    print(f"Summary generated: {summary}")

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    os.chdir('c:\\Users\\vinu\\jannetra11\\project\\backend')
    load_dotenv()
    asyncio.run(test_update())
