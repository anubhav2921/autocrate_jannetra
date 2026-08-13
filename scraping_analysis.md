# News Scraping & Processing Analysis

## 1. Things That Are Not Working / Potential Scraping Pitfalls
Based on standard data pipelines and the current scraping architecture (e.g., NewsAPI, GDELT), here are common failure points and things that typically "don't work" without advanced handling:
*   **API Rate Limiting & Quotas:** Free tiers for services like NewsAPI are highly restricted (e.g., 100 requests/day). GDELT can frequently throw `429 Too Many Requests` if polled too aggressively.
*   **Truncated Content:** Aggregators often only provide a summary or the first 200 characters of an article. This heavily impacts the accuracy of AI sentiment and fake news analysis.
*   **Anti-Bot & Captcha Protections:** Standard `requests` library calls are easily blocked by Cloudflare, Datadome, or simple User-Agent filters on raw news websites.
*   **Dynamic / JS-Rendered Sites:** Scraping tools that do not execute JavaScript (like `BeautifulSoup` alone) fail to capture content from modern Single Page Applications (SPAs).
*   **Fragile Deduplication:** Exact string hashing for deduplication fails when different news outlets publish the same wire story with slightly altered headlines.

## 2. Step-by-Step Data Scraping & Processing Pipeline
To build an accurate and clear pipeline, follow these sequential steps:

1.  **Source Configuration & Discovery:**
    *   Maintain a dynamic list of target domains, RSS feeds, and API endpoints.
2.  **Ingestion & Scraping Layer:**
    *   *APIs & RSS:* Use asynchronous requests (e.g., `aiohttp`) for fast, lightweight ingestion.
    *   *Web Pages:* Use headless browsers (Playwright/Puppeteer) or extraction libraries (like `newspaper3k` or `trafilatura`) to bypass anti-bot measures and extract core article text.
3.  **Data Cleaning & Normalization:**
    *   Strip HTML boilerplate, ads, and navigation links.
    *   Normalize timestamps to standard UTC ISO formats.
4.  **Deduplication & Entity Resolution:**
    *   Use semantic similarity (e.g., TF-IDF or lightweight embeddings) instead of exact hashing to detect duplicate stories across different publishers.
5.  **AI & NLP Enrichment:**
    *   Run Sentiment Analysis, Entity Extraction (NER for locations/people), and Topic Classification using models like DistilBERT.
6.  **Persistence & Indexing:**
    *   Store the raw and enriched data into a primary database, and optionally push to a search index for fast dashboard querying.

## 3. Suitable Free Database Options
For storing scraped news and general data storage, the database needs to handle unstructured text efficiently. Here are the best free options:

### A. MongoDB (Recommended for Scraping)
*   **Why it fits:** News data schemas change frequently. MongoDB's document-based (NoSQL) structure is perfect for storing nested JSON from various news APIs.
*   **Free Tier:** MongoDB Atlas offers a forever-free "M0" cluster (512MB storage). It can also be self-hosted locally for completely free, unlimited storage.
*   **Pros:** Flexible schema, natively used in the current JanNetra architecture, easy to integrate with Python (Motor).

### B. PostgreSQL (Recommended for Analytics)
*   **Why it fits:** If you want strict data integrity alongside unstructured data.
*   **Free Tier:** Services like Supabase or Neon provide excellent free tiers.
*   **Pros:** Supports `JSONB` columns so you can store unstructured scraped data while keeping core metrics (users, alerts) highly structured. Excellent for complex querying.

### C. SQLite
*   **Why it fits:** Best for local development and very lightweight scraping.
*   **Free Tier:** 100% free, file-based, no server required.
*   **Pros:** Zero setup.
*   **Cons:** Not suitable for high-concurrency writing (when multiple scrapers are running simultaneously).

### Summary Recommendation
Stick with **MongoDB** for the raw scraping storage due to its schema flexibility, and use a local or self-hosted instance to bypass the 512MB cloud free-tier limit. If you prefer relational data and cloud hosting, **PostgreSQL (via Supabase)** using `JSONB` is the best free alternative.
