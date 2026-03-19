from app.database import SessionLocal
from app.models import NewsArticle
from app.services.mock_data import get_seed_data
import hashlib
from datetime import datetime
from app.services.data_pipeline import _resolve_location, _process_article

def seed_db():
    db = SessionLocal()
    _, articles = get_seed_data()
    print(f"Seeding {len(articles)} mock articles")
    
    count = 0
    # ensure some articles go to Prayagraj, Lucknow, and Kanpur
    articles[0]['location'] = "Prayagraj"
    articles[1]['location'] = "Prayagraj"
    articles[2]['location'] = "Lucknow"
    articles[3]['location'] = "Kanpur"
    articles[4]['location'] = "Varanasi"

    
    for _art in articles:
        # construct raw article dict similar to scrapers
        import random
        art = {
            "title": _art["title"],
            "content": _art["raw_text"],
            "source_name": _art["source_name"],
            "published_at": _art["ingested_at"],
            "credibility": _art["source_data"]["historical_accuracy"],
            "source_type": _art["source_data"]["source_type"],
            "tier": _art["source_data"]["credibility_tier"],
            "category_hint": _art["category"],
            "content_hash": _art["content_hash"] + str(random.randint(1000, 9999)),
            "location": _art["location"]
        }
        
        # process through nlp & categorization
        processed = _process_article(art)
        loc = _resolve_location(processed)
        
        news_record = NewsArticle(
            title=processed["title"],
            content=processed["content"],
            source_name=processed["source_name"],
            source_url=processed.get("source_url", ""),
            url=processed.get("url", ""),
            published_at=processed.get("published_at"),
            content_hash=processed["content_hash"],
            credibility_score=processed.get("credibility_score", 0.5),
            risk_score=processed.get("risk_score", 0.0),
            risk_level=processed.get("risk_level", "LOW"),
            sentiment_label=processed.get("sentiment_label", "NEUTRAL"),
            sentiment_polarity=processed.get("sentiment_polarity", 0.0),
            anger_rating=processed.get("anger_rating", 0.0),
            fake_news_label=processed.get("fake_news_label", "UNCERTAIN"),
            fake_news_confidence=processed.get("fake_news_confidence", 0.0),
            category=processed.get("category", "General"),
            source_type=processed.get("source_type", "NEWS"),
            tier=processed.get("tier", "UNKNOWN"),
            scraped_at=datetime.utcnow(),
            state=loc["state"],
            district=loc["district"],
            city=loc["city"],
            latitude=loc["latitude"],
            longitude=loc["longitude"],
        )
        db.add(news_record)
        count += 1
    
    db.commit()
    db.close()
    print(f"Seeded {count} records")

if __name__ == '__main__':
    seed_db()
