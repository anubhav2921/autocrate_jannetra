"""
Reddit Complaint Scraper — Fetches governance complaints from Indian subreddits.
═══════════════════════════════════════════════════════════════════════════════════
Scrapes public Reddit posts using Reddit's JSON API (no key needed).

Target subreddits:
  • r/india              — General India discussions & complaints
  • r/IndiaGovernance    — Governance-specific discussions
  • r/LegalAdviceIndia   — Legal & civic complaints
  • r/AskIndia           — Public queries / grievances
  • r/indianews          — Indian news & issues
  • r/bangalore, r/mumbai, r/delhi, r/hyderabad  — City-specific complaints

Filters posts by governance-related keywords to extract genuine complaints.
"""

import logging
import hashlib
import time
from datetime import datetime, timezone
from typing import Optional

import requests

logger = logging.getLogger("jannetra.scrapers.reddit")

# ── Configuration ────────────────────────────────────────────────────
TIMEOUT = 20
MAX_RETRIES = 2
RATE_LIMIT_DELAY = 2  # seconds between subreddit requests (Reddit rate limits)

HEADERS = {
    "User-Agent": "JanNetra/1.0 Governance-Intelligence-System (by JanNetra-Bot)"
}

# ── Subreddits to scrape ─────────────────────────────────────────────
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

# ── Complaint / governance-related keywords ──────────────────────────
# Posts must match at least one keyword to be considered a complaint
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

# Subreddit → likely city/location mapping
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
    """SHA-256 hash for deduplication."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _is_complaint_post(title: str, selftext: str) -> bool:
    """Check if a Reddit post is governance/complaint-related."""
    combined = (title + " " + selftext).lower()
    return any(kw in combined for kw in COMPLAINT_KEYWORDS)


def _extract_location(title: str, selftext: str, subreddit: str) -> Optional[str]:
    """Try to extract a location from the post or infer from subreddit."""
    # Check if subreddit maps to a city
    if subreddit.lower() in SUBREDDIT_LOCATION_MAP:
        return SUBREDDIT_LOCATION_MAP[subreddit.lower()]

    # Basic keyword-based location extraction
    combined = (title + " " + selftext).lower()
    cities = {
        "mumbai": "Mumbai, Maharashtra",
        "delhi": "Delhi, NCR",
        "bangalore": "Bangalore, Karnataka",
        "bengaluru": "Bangalore, Karnataka",
        "hyderabad": "Hyderabad, Telangana",
        "chennai": "Chennai, Tamil Nadu",
        "kolkata": "Kolkata, West Bengal",
        "pune": "Pune, Maharashtra",
        "ahmedabad": "Ahmedabad, Gujarat",
        "jaipur": "Jaipur, Rajasthan",
        "lucknow": "Lucknow, Uttar Pradesh",
        "chandigarh": "Chandigarh",
        "bhopal": "Bhopal, Madhya Pradesh",
        "patna": "Patna, Bihar",
        "gurgaon": "Gurgaon, Haryana",
        "noida": "Noida, Uttar Pradesh",
        "kochi": "Kochi, Kerala",
        "indore": "Indore, Madhya Pradesh",
        "nagpur": "Nagpur, Maharashtra",
        "surat": "Surat, Gujarat",
        "prayagraj": "Prayagraj, Uttar Pradesh",
        "allahabad": "Allahabad, Uttar Pradesh",
        "kanpur": "Kanpur, Uttar Pradesh",
        "varanasi": "Varanasi, Uttar Pradesh",
        "agra": "Agra, Uttar Pradesh",
        "ghaziabad": "Ghaziabad, Uttar Pradesh"
    }

    for city_kw, city_name in cities.items():
        if city_kw in combined:
            return city_name

    return "India"


def _scrape_subreddit(config: dict) -> list[dict]:
    """
    Scrape a single subreddit using Reddit's public JSON API.

    Uses: https://www.reddit.com/r/{subreddit}/{sort}.json?limit=N
    """
    subreddit = config["name"]
    sort = config.get("sort", "new")
    limit = config.get("limit", 15)
    credibility = config.get("credibility", 0.50)

    url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
    params = {"limit": limit, "t": "week"}  # t=week for top/hot/controversial

    logger.info("[Reddit] Fetching r/%s (%s, limit=%d)...", subreddit, sort, limit)

    articles = []

    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=TIMEOUT)

        if resp.status_code == 429:
            logger.warning("[Reddit] Rate limited on r/%s — skipping", subreddit)
            return []

        resp.raise_for_status()
        data = resp.json()

        posts = data.get("data", {}).get("children", [])

        for post_wrapper in posts:
            post = post_wrapper.get("data", {})

            # Skip pinned, stickied, removed, or media-only posts
            if post.get("stickied") or post.get("removed_by_category"):
                continue

            title = (post.get("title") or "").strip()
            selftext = (post.get("selftext") or "").strip()

            if not title:
                continue

            # Only keep complaint/governance-related posts
            if not _is_complaint_post(title, selftext):
                continue

            # Build content: title + selftext
            content = selftext if selftext else title
            if len(content) < 30:
                content = title + " — " + content

            # Truncate very long Reddit posts
            content = content[:5000]

            # Timestamp
            created_utc = post.get("created_utc", 0)
            published_at = datetime.fromtimestamp(created_utc, tz=timezone.utc) if created_utc else datetime.now(timezone.utc)

            # Location detection
            location = _extract_location(title, selftext, subreddit)

            # Build the permalink
            permalink = post.get("permalink", "")
            post_url = f"https://www.reddit.com{permalink}" if permalink else ""

            # Upvote score as a rough engagement signal
            score = post.get("score", 0)
            num_comments = post.get("num_comments", 0)

            # Adjust credibility based on engagement (more upvotes = more credible)
            adjusted_credibility = credibility
            if score > 100:
                adjusted_credibility = min(credibility + 0.15, 0.85)
            elif score > 50:
                adjusted_credibility = min(credibility + 0.10, 0.80)
            elif score > 20:
                adjusted_credibility = min(credibility + 0.05, 0.75)

            flair = post.get("link_flair_text", "") or ""

            articles.append({
                "title": title[:500],
                "content": content,
                "source_name": f"Reddit — r/{subreddit}",
                "source_url": f"https://www.reddit.com/r/{subreddit}/",
                "url": post_url,
                "published_at": published_at,
                "credibility": adjusted_credibility,
                "source_type": "SOCIAL_MEDIA",
                "tier": "UNKNOWN",
                "category_hint": flair if flair else "General",
                "content_hash": _content_hash(title + content),
                # Extra metadata for complaints
                "location": location,
                "reddit_score": score,
                "reddit_comments": num_comments,
                "reddit_flair": flair,
                "subreddit": subreddit,
            })

        logger.info(
            "[Reddit] ✅ r/%s — %d complaint posts found (out of %d total)",
            subreddit, len(articles), len(posts),
        )

    except requests.RequestException as e:
        logger.error("[Reddit] ❌ Failed to fetch r/%s: %s", subreddit, e)
    except (ValueError, KeyError) as e:
        logger.error("[Reddit] ❌ Parse error for r/%s: %s", subreddit, e)

    return articles


def scrape_reddit_complaints() -> list[dict]:
    """
    Scrape all configured Indian subreddits for governance complaints.

    Returns normalized article dicts compatible with the data pipeline.
    """
    logger.info("[Reddit] ═══════════════════════════════════════════════")
    logger.info("[Reddit] Starting Reddit complaint scraper...")
    logger.info("[Reddit] Targeting %d subreddits", len(SUBREDDIT_CONFIG))
    logger.info("[Reddit] ═══════════════════════════════════════════════")

    all_complaints: list[dict] = []

    for i, config in enumerate(SUBREDDIT_CONFIG):
        complaints = _scrape_subreddit(config)
        all_complaints.extend(complaints)

        # Rate limiting: wait between requests to avoid 429
        if i < len(SUBREDDIT_CONFIG) - 1:
            time.sleep(RATE_LIMIT_DELAY)

    logger.info(
        "[Reddit] ═══════════════════════════════════════════════"
    )
    logger.info(
        "[Reddit] Scrape complete — %d total complaints from %d subreddits",
        len(all_complaints), len(SUBREDDIT_CONFIG),
    )
    logger.info("[Reddit] ═══════════════════════════════════════════════")

    return all_complaints
