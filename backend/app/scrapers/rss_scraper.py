"""
RSS Scraper — Fetches governance & news articles from major Indian RSS feeds.
═══════════════════════════════════════════════════════════════════════════════
Stable, structured sources that rarely break:
  • NDTV India
  • The Hindu National
  • Times of India Top Stories
  • Hindustan Times India
  • PIB India (Press Information Bureau)
  • LiveMint Politics
  • Indian Express India
"""

import logging
import hashlib
from datetime import datetime
from typing import Optional

import feedparser
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("jannetra.scrapers.rss")

# ── RSS Feed Registry ────────────────────────────────────────────────
# Each entry: (name, url, credibility_score 0-1, source_type)
RSS_FEEDS: list[dict] = [
    {
        "name": "NDTV India",
        "url": "https://feeds.feedburner.com/ndtvnews-india-news",
        "credibility": 0.88,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "General",
    },
    {
        "name": "The Hindu — National",
        "url": "https://www.thehindu.com/news/national/feeder/default.rss",
        "credibility": 0.90,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "General",
    },
    {
        "name": "Times of India — India",
        "url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
        "credibility": 0.85,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "General",
    },
    {
        "name": "Hindustan Times — India",
        "url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
        "credibility": 0.84,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "General",
    },
    {
        "name": "Indian Express — India",
        "url": "https://indianexpress.com/section/india/feed/",
        "credibility": 0.87,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "General",
    },
    {
        "name": "LiveMint — Politics",
        "url": "https://www.livemint.com/rss/politics",
        "credibility": 0.83,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "Corruption",
    },
    {
        "name": "PIB India — Press Releases",
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
        "credibility": 0.95,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "General",
    },
    {
        "name": "Down To Earth — Environment",
        "url": "https://www.downtoearth.org.in/rss/news",
        "credibility": 0.82,
        "source_type": "NEWS",
        "tier": "VERIFIED",
        "category_hint": "Environment",
    },
]

# Maximum articles per feed per scrape cycle
MAX_PER_FEED = 10

# Request timeout (seconds)
TIMEOUT = 15

# User-Agent to avoid blocks
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36 JanNetra/1.0"
    )
}


def _parse_published_date(entry: dict) -> Optional[datetime]:
    """Extract a datetime from various RSS date fields."""
    for field in ("published_parsed", "updated_parsed"):
        parsed = entry.get(field)
        if parsed:
            try:
                from time import mktime
                return datetime.fromtimestamp(mktime(parsed))
            except (ValueError, OverflowError, TypeError):
                continue

    # Fallback: try raw string
    for field in ("published", "updated"):
        raw = entry.get(field, "")
        if raw:
            for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%dT%H:%M:%S%z"):
                try:
                    return datetime.strptime(raw.strip(), fmt)
                except ValueError:
                    continue
    return None


def _extract_text_from_html(html: str) -> str:
    """Strip HTML tags from RSS content/summary."""
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    return soup.get_text(separator=" ", strip=True)


def _content_hash(text: str) -> str:
    """SHA-256 hash for deduplication."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def scrape_rss_feeds(feeds: list[dict] | None = None) -> list[dict]:
    """
    Scrape all configured RSS feeds and return normalized article dicts.

    Returns list of:
        {
            "title": str,
            "content": str,
            "source_name": str,
            "source_url": str,
            "url": str,
            "published_at": datetime | None,
            "credibility": float,
            "source_type": str,
            "tier": str,
            "category_hint": str,
            "content_hash": str,
        }
    """
    feeds = feeds or RSS_FEEDS
    articles: list[dict] = []
    total_success = 0
    total_failed = 0

    for feed_info in feeds:
        feed_name = feed_info["name"]
        feed_url = feed_info["url"]

        logger.info("[RSS] Fetching: %s → %s", feed_name, feed_url)

        try:
            resp = requests.get(feed_url, headers=HEADERS, timeout=TIMEOUT)
            resp.raise_for_status()

            parsed = feedparser.parse(resp.content)
            entries = parsed.entries[:MAX_PER_FEED]

            if not entries:
                logger.warning("[RSS] No entries in feed: %s", feed_name)
                total_failed += 1
                continue

            feed_count = 0
            for entry in entries:
                title = entry.get("title", "").strip()
                if not title:
                    continue

                # Extract content: prefer content > summary > description
                raw_html = ""
                if entry.get("content"):
                    raw_html = entry["content"][0].get("value", "")
                if not raw_html:
                    raw_html = entry.get("summary", "") or entry.get("description", "")

                content = _extract_text_from_html(raw_html)

                # Skip very short articles (likely just teasers)
                if len(content) < 50:
                    content = title  # Use title as fallback

                link = entry.get("link", "") or entry.get("id", "")
                published_at = _parse_published_date(entry)

                c_hash = _content_hash(title + content)

                articles.append({
                    "title": title[:500],
                    "content": content[:5000],
                    "source_name": feed_name,
                    "source_url": feed_url,
                    "url": link,
                    "published_at": published_at or datetime.utcnow(),
                    "credibility": feed_info["credibility"],
                    "source_type": feed_info["source_type"],
                    "tier": feed_info["tier"],
                    "category_hint": feed_info["category_hint"],
                    "content_hash": c_hash,
                })
                feed_count += 1

            total_success += 1
            logger.info(
                "[RSS] ✅ %s — collected %d articles", feed_name, feed_count
            )

        except requests.RequestException as e:
            total_failed += 1
            logger.error("[RSS] ❌ Failed to fetch %s: %s", feed_name, e)
        except Exception as e:
            total_failed += 1
            logger.error("[RSS] ❌ Error parsing %s: %s", feed_name, e)

    logger.info(
        "[RSS] Scrape complete — %d feeds OK, %d failed, %d articles total",
        total_success, total_failed, len(articles),
    )
    return articles
