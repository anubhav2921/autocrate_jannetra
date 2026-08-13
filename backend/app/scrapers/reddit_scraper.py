"""
Reddit Complaint Scraper — Fetches governance complaints from Indian subreddits.

Reddit's JSON API now requires authentication. This scraper uses Reddit's
public RSS feeds (which still work without credentials) to pull posts
from Indian governance/city subreddits.
"""

import logging
import hashlib
import time
import re
import json
from datetime import datetime, timezone
from typing import Optional

import requests
from bs4 import BeautifulSoup

from app.services.location_service import resolve_location_from_text

logger = logging.getLogger("jannetra.scrapers.reddit")

TIMEOUT = 25
RATE_LIMIT_DELAY = 1.5  # seconds between requests

# Use a realistic rotating User-Agent pool
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Accept": "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "max-age=0",
}

# Subreddits accessible via RSS
SUBREDDIT_CONFIG = [
    {"name": "india",             "credibility": 0.55, "sort": "new",  "limit": 25},
    {"name": "IndiaGovernance",   "credibility": 0.60, "sort": "new",  "limit": 15},
    {"name": "LegalAdviceIndia",  "credibility": 0.65, "sort": "new",  "limit": 15},
    {"name": "AskIndia",          "credibility": 0.50, "sort": "new",  "limit": 15},
    {"name": "indianews",         "credibility": 0.55, "sort": "new",  "limit": 15},
    {"name": "bangalore",         "credibility": 0.55, "sort": "new",  "limit": 10},
    {"name": "mumbai",            "credibility": 0.55, "sort": "new",  "limit": 10},
    {"name": "delhi",             "credibility": 0.55, "sort": "new",  "limit": 10},
    {"name": "hyderabad",         "credibility": 0.55, "sort": "new",  "limit": 10},
    {"name": "chennai",           "credibility": 0.55, "sort": "new",  "limit": 10},
    {"name": "kolkata",           "credibility": 0.55, "sort": "new",  "limit": 10},
    {"name": "pune",              "credibility": 0.55, "sort": "new",  "limit": 10},
]

# Complaint / governance-related keywords
COMPLAINT_KEYWORDS = [
    # Governance issues
    "corruption", "bribe", "scam", "fraud", "nepotism", "malpractice",
    # Infrastructure
    "pothole", "road", "water supply", "electricity", "power cut", "construction",
    "sewage", "drain", "flood", "infrastructure",
    # Civic complaints
    "complaint", "grievance", "problem", "issue", "broken", "unsafe",
    "dangerous", "illegal", "negligence", "poor condition",
    # Public services
    "hospital", "school", "police", "ration", "pension", "subsidy",
    "aadhar", "aadhaar", "passport", "license",
    # Environment & sanitation
    "pollution", "garbage", "waste", "smell", "noise", "contaminated",
    "dirty", "stray dogs", "mosquito", "waterlogging",
    # Transport
    "traffic", "bus", "metro", "auto", "rickshaw", "parking",
    "accident", "signal", "footpath", "pavement",
    # Housing & civic
    "eviction", "demolition", "encroachment", "builder", "flat", "rent",
    "society", "maintenance", "apartment",
    # Government services
    "government", "municipality", "corporation", "nagar nigam",
    "collector", "tehsil", "panchayat", "mla", "mp", "ward",
    # Safety
    "crime", "theft", "robbery", "harassment", "stalking", "women safety",
]

SUBREDDIT_LOCATION_MAP = {
    "bangalore": "Bangalore, Karnataka",
    "mumbai": "Mumbai, Maharashtra",
    "delhi": "Delhi, NCR",
    "hyderabad": "Hyderabad, Telangana",
    "chennai": "Chennai, Tamil Nadu",
    "kolkata": "Kolkata, West Bengal",
    "pune": "Pune, Maharashtra",
}


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _is_complaint_post(title: str, selftext: str) -> bool:
    """Check if a Reddit post is a governance/complaint-related issue."""
    text = (title + " " + selftext).lower()
    return any(kw in text for kw in COMPLAINT_KEYWORDS)


def _extract_location(title: str, selftext: str, subreddit: str) -> str:
    subreddit_lower = subreddit.lower()
    if subreddit_lower in SUBREDDIT_LOCATION_MAP:
        return SUBREDDIT_LOCATION_MAP[subreddit_lower].split(",")[0].strip()
    loc = resolve_location_from_text(title, selftext)
    return loc["city"]


def _scrape_subreddit_rss(config: dict) -> list[dict]:
    """
    Scrape a subreddit via its .rss feed (no auth needed).
    URL: https://www.reddit.com/r/{subreddit}/{sort}/.rss
    """
    subreddit = config["name"]
    sort = config.get("sort", "new")
    credibility = config.get("credibility", 0.50)

    url = f"https://www.reddit.com/r/{subreddit}/{sort}/.rss"
    logger.info("[Reddit] Fetching RSS: r/%s (%s)...", subreddit, sort)

    articles = []
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)

        if resp.status_code == 429:
            logger.warning("[Reddit] Rate limited on r/%s — skipping", subreddit)
            return []
        if resp.status_code == 403:
            logger.warning("[Reddit] 403 Forbidden for r/%s — subreddit may be private/quarantined", subreddit)
            return []

        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "xml")
        entries = soup.find_all("entry")

        if not entries:
            # Try Atom or RSS2 format
            entries = soup.find_all("item")

        for entry in entries:
            title_tag = entry.find("title")
            title = title_tag.get_text(strip=True) if title_tag else ""
            if not title:
                continue

            # Content
            content_tag = entry.find("content") or entry.find("description") or entry.find("summary")
            raw_content = content_tag.get_text(separator=" ", strip=True) if content_tag else ""
            # Strip HTML tags from content
            content = BeautifulSoup(raw_content, "html.parser").get_text(separator=" ", strip=True)[:2000]

            # Only keep complaint/governance-related posts
            if not _is_complaint_post(title, content):
                continue

            # URL
            link_tag = entry.find("link")
            if link_tag:
                post_url = link_tag.get("href") or link_tag.get_text(strip=True)
            else:
                post_url = ""

            # Published date
            published_tag = entry.find("published") or entry.find("updated") or entry.find("pubDate")
            published_at = datetime.now(timezone.utc)
            if published_tag:
                try:
                    pub_str = published_tag.get_text(strip=True)
                    # ISO format: 2024-01-15T12:30:00+00:00
                    published_at = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            location = _extract_location(title, content, subreddit)

            articles.append({
                "title": title[:500],
                "content": content if content else title,
                "source_name": f"Reddit — r/{subreddit}",
                "source_url": f"https://www.reddit.com/r/{subreddit}/",
                "url": post_url,
                "published_at": published_at,
                "credibility": credibility,
                "source_type": "SOCIAL_MEDIA",
                "tier": "UNKNOWN",
                "category_hint": "General",
                "content_hash": _content_hash(title + content),
                "source_domain": "reddit.com",
                "location": location,
                "subreddit": subreddit,
            })

        logger.info("[Reddit] ✅ r/%s — %d complaint posts found (out of %d entries)", subreddit, len(articles), len(entries))

    except requests.RequestException as e:
        logger.error("[Reddit] ❌ Failed to fetch r/%s: %s", subreddit, e)
    except Exception as e:
        logger.error("[Reddit] ❌ Parse error for r/%s: %s", subreddit, e)

    return articles


def scrape_reddit_complaints(city: Optional[str] = None) -> list[dict]:
    """
    Scrape all configured Indian subreddits for governance complaints via RSS.
    """
    logger.info("[Reddit] Starting Reddit RSS complaint scraper...")
    logger.info("[Reddit] Targeting %d subreddits", len(SUBREDDIT_CONFIG))

    all_complaints: list[dict] = []

    for i, config in enumerate(SUBREDDIT_CONFIG):
        complaints = _scrape_subreddit_rss(config)
        all_complaints.extend(complaints)

        if i < len(SUBREDDIT_CONFIG) - 1:
            time.sleep(RATE_LIMIT_DELAY)

    # Filter by city if provided
    if city and all_complaints:
        city_lower = city.lower()
        filtered = [c for c in all_complaints if city_lower in (c.get("location") or "").lower()
                    or city_lower in (c.get("title") or "").lower()
                    or city_lower in (c.get("content") or "").lower()]
        if filtered:
            all_complaints = filtered

    logger.info("[Reddit] Scrape complete — %d total complaints from %d subreddits",
                len(all_complaints), len(SUBREDDIT_CONFIG))

    return all_complaints
