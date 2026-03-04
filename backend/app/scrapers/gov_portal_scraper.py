"""
Government Portal Scraper — Fetches press releases from Indian gov portals.
═══════════════════════════════════════════════════════════════════════════
Stable government sources:
  • PIB (Press Information Bureau) — RSS feed
  • data.gov.in — Open Government Data
  • MyGov.in — Citizen engagement

These are the most reliable, high-credibility sources for governance data.
"""

import logging
import hashlib
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("jannetra.scrapers.gov")

TIMEOUT = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36 JanNetra/1.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ── data.gov.in Catalog API (free, no key needed) ───────────────────
DATAGOV_CATALOG_URL = "https://data.gov.in/backend/dmspublic/v1/resources"


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def scrape_pib_releases(max_articles: int = 15) -> list[dict]:
    """
    Scrape PIB India press releases from their web page.
    PIB is the official communication channel of the Government of India.
    """
    articles: list[dict] = []
    pib_url = "https://pib.gov.in/allRel.aspx"

    logger.info("[GOV/PIB] Fetching press releases from PIB India...")

    try:
        resp = requests.get(pib_url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")

        # PIB lists press releases in content blocks
        release_items = soup.select(".content_list ul li a")
        if not release_items:
            # Fallback selectors
            release_items = soup.select("a[href*='PressRelease']")
            if not release_items:
                release_items = soup.select(".ul_press_releases li a")

        count = 0
        for link_tag in release_items[:max_articles]:
            title = link_tag.get_text(strip=True)
            href = link_tag.get("href", "")

            if not title or len(title) < 10:
                continue

            # Build full URL
            if href and not href.startswith("http"):
                href = f"https://pib.gov.in/{href}"

            articles.append({
                "title": title[:500],
                "content": title,  # PIB listings are title-only; full content needs per-page fetch
                "source_name": "PIB India — Press Releases",
                "source_url": "https://pib.gov.in",
                "url": href,
                "published_at": datetime.utcnow(),
                "credibility": 0.95,
                "source_type": "NEWS",
                "tier": "VERIFIED",
                "category_hint": "General",
                "content_hash": _content_hash(title + href),
            })
            count += 1

        logger.info("[GOV/PIB] ✅ Collected %d press releases", count)

    except requests.RequestException as e:
        logger.error("[GOV/PIB] ❌ Failed to fetch PIB: %s", e)
    except Exception as e:
        logger.error("[GOV/PIB] ❌ Parse error: %s", e)

    return articles


def scrape_datagov_datasets(max_items: int = 10) -> list[dict]:
    """
    Fetch metadata from data.gov.in Open Data Portal.
    The catalog API lists government datasets — useful for identifying
    governance data availability and updates.
    """
    articles: list[dict] = []
    logger.info("[GOV/DataGov] Fetching datasets from data.gov.in...")

    try:
        resp = requests.get(
            DATAGOV_CATALOG_URL,
            params={
                "filters[sector]": "All",
                "offset": 0,
                "limit": max_items,
                "sort[updated]": "desc",
            },
            headers=HEADERS,
            timeout=TIMEOUT,
        )

        # data.gov.in may return various formats
        if resp.status_code == 200:
            try:
                data = resp.json()
                records = data.get("records", data.get("result", []))

                if isinstance(records, list):
                    for item in records[:max_items]:
                        title = (
                            item.get("title", "")
                            or item.get("name", "")
                            or item.get("resource_title", "")
                        ).strip()

                        if not title or len(title) < 5:
                            continue

                        desc = item.get("description", "") or item.get("notes", "")
                        org = item.get("org", {})
                        org_name = org.get("name", "Government of India") if isinstance(org, dict) else "Government of India"

                        articles.append({
                            "title": f"[Dataset] {title}"[:500],
                            "content": desc[:5000] if desc else title,
                            "source_name": f"data.gov.in — {org_name}",
                            "source_url": "https://data.gov.in",
                            "url": f"https://data.gov.in/resource/{item.get('id', '')}",
                            "published_at": datetime.utcnow(),
                            "credibility": 0.92,
                            "source_type": "NEWS",
                            "tier": "VERIFIED",
                            "category_hint": "General",
                            "content_hash": _content_hash(title),
                        })

            except ValueError:
                logger.warning("[GOV/DataGov] Response is not JSON — skipping")
        else:
            logger.warning("[GOV/DataGov] HTTP %d from data.gov.in", resp.status_code)

        logger.info("[GOV/DataGov] ✅ Collected %d dataset entries", len(articles))

    except requests.RequestException as e:
        logger.error("[GOV/DataGov] ❌ Request failed: %s", e)

    return articles


def scrape_government_portals() -> list[dict]:
    """Run all government portal scrapers and combine results."""
    results = []
    results.extend(scrape_pib_releases())
    results.extend(scrape_datagov_datasets())
    logger.info("[GOV] Combined total: %d articles", len(results))
    return results
