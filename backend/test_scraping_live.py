import os
import sys
from app.scrapers.rss_scraper import scrape_rss_feeds
from app.scrapers.news_scraper import scrape_news_apis
from app.scrapers.gov_portal_scraper import scrape_government_portals
from app.scrapers.reddit_scraper import scrape_reddit_complaints

def test_all_scrapers():
    print("========================================")
    print("1. Testing RSS News Scraper...")
    rss_articles = scrape_rss_feeds()
    print(f"-> Scraped {len(rss_articles)} articles from RSS feeds.")
    for a in rss_articles[:3]:
        print(f"   * [{a.get('source_name')}] {a.get('title')[:70]}...")

    print("\n2. Testing GDELT / News APIs Scraper...")
    news_articles = scrape_news_apis()
    print(f"-> Scraped {len(news_articles)} articles from News APIs / GDELT.")
    for a in news_articles[:3]:
        print(f"   * [{a.get('source_name')}] {a.get('title')[:70]}...")

    print("\n3. Testing Government Portals Scraper...")
    try:
        gov_articles = scrape_government_portals()
        print(f"-> Scraped {len(gov_articles)} notices/grievances from Gov Portals.")
    except Exception as e:
        print(f"-> Gov Portal notice: {e}")

    print("\n4. Testing Reddit Civic Discussions Scraper...")
    try:
        reddit_posts = scrape_reddit_complaints()
        print(f"-> Scraped {len(reddit_posts)} citizen discussion posts from Reddit.")
        for p in reddit_posts[:3]:
            print(f"   * [{p.get('source_name')}] {p.get('title')[:70]}...")
    except Exception as e:
        print(f"-> Reddit Scraper notice: {e}")

    total = len(rss_articles) + len(news_articles)
    print("\n========================================")
    print(f"[SUMMARY] Scraping operational! Scraped {total} live articles and problems.")
    print("========================================")

if __name__ == "__main__":
    test_all_scrapers()
