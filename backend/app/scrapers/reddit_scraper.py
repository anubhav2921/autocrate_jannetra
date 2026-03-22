"""
Reddit Complaint Scraper — Fetches governance complaints from Indian subreddits.

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
import re
from datetime import datetime, timezone
from typing import Optional

import requests

from app.services.location_service import resolve_location_from_text

logger = logging.getLogger("jannetra.scrapers.reddit")

# Configuration
TIMEOUT = 20
MAX_RETRIES = 2
RATE_LIMIT_DELAY = 2  # seconds between subreddit requests (Reddit rate limits)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
}

# Subreddits to scrape
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

# ─────────────────────────────────────────────
# LAYER 2: Filter OUT — these look like news
# ─────────────────────────────────────────────
NEWS_FILTERS = [
    r"\b(according to|sources say|officials said|reports say|as per)\b",
    r"\b(times of india|hindustan times|ndtv|the hindu|india today|ani|pti|bbc|reuters)\b",
    r"\b(breaking|exclusive|report|update)\s*:",
    r"https?://\S+",                          # external links = news share
    r"\b(government (has|have|will) (launched|announced|started|introduced))\b",
    r"\b(scheme launched|new policy|budget allocated|crore sanctioned)\b",
    r"\b(in a statement|press release|told media|told reporters)\b",
]

# ─────────────────────────────────────────────
# LAYER 3: Keep — these are real personal complaints
# ─────────────────────────────────────────────
PERSONAL_COMPLAINT_SIGNALS = [
    # First-person ownership of the problem
    r"\b(my (area|colony|house|flat|street|locality|ward|building|road|lane))\b",
    r"\bwe (are facing|don't have|haven't had|have been suffering)\b",
    r"\bi (have complained|reported|tried|waited|am facing|can't)\b",

    # Asking for help
    r"\b(please help|help needed|need help|can anyone help)\b",
    r"\b(who (should|can|do) i (contact|call|complain|report))\b",
    r"\b(where (to|can i) (complain|report|file))\b",
    r"\b(what (to|can i) do|suggest (me|something))\b",

    # Frustration / no action
    r"\b(no action|nobody (is |)(listening|responding|helping|caring))\b",
    r"\b(still not (fixed|resolved|repaired|done))\b",
    r"\b(filed (a |)complaint|raised (the |)issue|written to)\b",
    r"\b(ignored|no response|no reply|nobody came)\b",

    # Duration — real complaints mention how long the problem exists
    r"\b(since (last |)\d+ (days|weeks|months|years))\b",
    r"\b(for the past (few |)\d* *(days|weeks|months|years))\b",
    r"\b(last \d+ (days|weeks|months))\b",
    r"\b(months ago|weeks ago|years ago).{0,40}(still|not|no)\b",

    # Specific local references
    r"\b(sector \d+|ward no\.? *\d+|block [a-zA-Z]\b)",
    r"\bnear\s+\w[\w\s]{2,25}(chowk|nagar|colony|marg|road|bazaar|gali)\b",
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
    """Check if a Reddit post is a personal governance/complaint-related issue."""
    text = (title + " " + selftext).lower()

    # Step 1: Must contain at least one complaint keyword
    has_keyword = any(kw in text for kw in COMPLAINT_KEYWORDS)
    if not has_keyword:
        return False

    # Step 2: Reject if it looks like a news article or general discussion
    for pattern in NEWS_FILTERS:
        if re.search(pattern, text, re.IGNORECASE):
            return False

    # Step 3: Accept if it has a personal complaint signal
    for pattern in PERSONAL_COMPLAINT_SIGNALS:
        if re.search(pattern, text, re.IGNORECASE):
            return True

    # Step 4: Reject if no personal signal found
    return False


def _extract_location(title: str, selftext: str, subreddit: str) -> Optional[str]:
    """Try to extract a location from the post or infer from subreddit."""
    subreddit_lower = subreddit.lower()
    
    # Check if subreddit maps to a city (highest priority)
    if subreddit_lower in SUBREDDIT_LOCATION_MAP:
        return SUBREDDIT_LOCATION_MAP[subreddit_lower]

    # Use centralized LocationService to scan text
    loc = resolve_location_from_text(title, selftext)
    return loc["city"]


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
                "source_domain": "reddit.com",
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
    logger.info("[Reddit] ")
    logger.info("[Reddit] Starting Reddit complaint scraper...")
    logger.info("[Reddit] Targeting %d subreddits", len(SUBREDDIT_CONFIG))
    logger.info("[Reddit] ")

    all_complaints: list[dict] = []

    for i, config in enumerate(SUBREDDIT_CONFIG):
        complaints = _scrape_subreddit(config)
        all_complaints.extend(complaints)

        # Rate limiting: wait between requests to avoid 429
        if i < len(SUBREDDIT_CONFIG) - 1:
            time.sleep(RATE_LIMIT_DELAY)

    logger.info(
        "[Reddit] "
    )
    logger.info(
        "[Reddit] Scrape complete — %d total complaints from %d subreddits",
        len(all_complaints), len(SUBREDDIT_CONFIG),
    )
    logger.info("[Reddit] ")

    return all_complaints
