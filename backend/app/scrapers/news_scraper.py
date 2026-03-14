"""
News API Scraper — Fetches governance articles from NewsAPI.org + GDELT.

Uses external news aggregation APIs for broad coverage:
  • NewsAPI.org   — curated headlines from 150+ sources
  • GDELT API     — global events (free, no key needed)

Config (backend/.env):
  NEWSAPI_KEY=your-newsapi-key   (optional, free tier: 100 req/day)
"""

import os
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("jannetra.scrapers.news")

NEWSAPI_KEY: str = os.getenv("NEWSAPI_KEY", "")
NEWSAPI_URL = "https://newsapi.org/v2/everything"
GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"

TIMEOUT = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 JanNetra/1.0 Governance-Intelligence-System"
    )
}

# Governance-relevant search queries
GOVERNANCE_QUERIES = [
    "India governance corruption",
    "India infrastructure development",
    "India public health crisis",
    "India water supply shortage",
    "India education policy",
    "India law enforcement",
    "India environmental pollution",
]


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def scrape_newsapi(max_articles: int = 30) -> list[dict]:
    """
    Fetch governance-related India news from NewsAPI.org.
    Requires NEWSAPI_KEY in .env (free tier: 100 req/day, 1000 results/day).

    Returns normalized article dicts.
    """
    if not NEWSAPI_KEY:
        logger.warning(
            "[NewsAPI] NEWSAPI_KEY not set in .env — skipping NewsAPI scrape. "
            "Get a free key at https://newsapi.org/register"
        )
        return []

    articles: list[dict] = []
    from_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")

    for query in GOVERNANCE_QUERIES[:3]:  # Limit queries to conserve quota
        logger.info("[NewsAPI] Searching: %s", query)

        try:
            resp = requests.get(
                NEWSAPI_URL,
                params={
                    "q": query,
                    "language": "en",
                    "from": from_date,
                    "sortBy": "relevancy",
                    "pageSize": min(max_articles // 3, 10),
                    "apiKey": NEWSAPI_KEY,
                },
                headers=HEADERS,
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "ok":
                logger.warning("[NewsAPI] Bad response for '%s': %s", query, data.get("message"))
                continue

            for item in data.get("articles", []):
                title = (item.get("title") or "").strip()
                content = (item.get("content") or item.get("description") or "").strip()
                source_name = item.get("source", {}).get("name", "Unknown")

                if not title or not content or "[Removed]" in title:
                    continue

                pub_str = item.get("publishedAt", "")
                published_at = None
                if pub_str:
                    try:
                        published_at = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                    except ValueError:
                        pass

                articles.append({
                    "title": title[:500],
                    "content": content[:5000],
                    "source_name": f"NewsAPI — {source_name}",
                    "source_url": "https://newsapi.org",
                    "url": item.get("url", ""),
                    "published_at": published_at or datetime.utcnow(),
                    "credibility": 0.70,  # Aggregator — moderate default
                    "source_type": "NEWS",
                    "tier": "UNKNOWN",
                    "category_hint": "General",
                    "content_hash": _content_hash(title + content),
                })

            logger.info("[NewsAPI] ✅ '%s' — %d articles", query, len(data.get("articles", [])))

        except requests.RequestException as e:
            logger.error("[NewsAPI] ❌ Failed for '%s': %s", query, e)

    logger.info("[NewsAPI] Total collected: %d articles", len(articles))
    return articles


def scrape_gdelt(max_articles: int = 20) -> list[dict]:
    """
    Fetch India governance-related events from GDELT Project (free, no key).
    Returns normalized article dicts.
    """
    articles: list[dict] = []
    query = "India governance OR corruption OR infrastructure OR healthcare"

    logger.info("[GDELT] Fetching events: %s", query)

    try:
        resp = requests.get(
            GDELT_URL,
            params={
                "query": query,
                "mode": "ArtList",
                "maxrecords": max_articles,
                "format": "json",
                "timespan": "7d",
            },
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        for item in data.get("articles", []):
            title = (item.get("title") or "").strip()
            url = item.get("url", "")
            source_name = item.get("domain", "GDELT")

            if not title:
                continue

            # GDELT provides minimal content — title is the main data
            content = title
            pub_str = item.get("seendate", "")
            published_at = None
            if pub_str:
                try:
                    published_at = datetime.strptime(pub_str[:14], "%Y%m%dT%H%M%S")
                except ValueError:
                    pass

            articles.append({
                "title": title[:500],
                "content": content[:5000],
                "source_name": f"GDELT — {source_name}",
                "source_url": "https://api.gdeltproject.org",
                "url": url,
                "published_at": published_at or datetime.utcnow(),
                "credibility": 0.60,
                "source_type": "NEWS",
                "tier": "UNKNOWN",
                "category_hint": "General",
                "content_hash": _content_hash(title + url),
            })

        logger.info("[GDELT] ✅ Collected %d articles", len(articles))

    except requests.RequestException as e:
        logger.error("[GDELT] ❌ Request failed: %s", e)
    except (ValueError, KeyError) as e:
        logger.error("[GDELT] ❌ Parse error: %s", e)

    return articles


def scrape_news_apis() -> list[dict]:
    """Run all news API scrapers and combine results."""
    results = []
    results.extend(scrape_newsapi())
    results.extend(scrape_gdelt())
    logger.info("[News APIs] Combined total: %d articles", len(results))
    return results
