# Data Scraping Mechanisms & Processing

This document outlines the core architecture and processes for reliable data extraction, trusted sources, and location-based categorization.

## 1. Core Mechanisms for Data Scraping
Depending on the target source, the system utilizes different extraction mechanisms:
*   **API Ingestion:** The most stable method. Connects directly to REST or GraphQL endpoints (e.g., NewsAPI, Reddit API) to receive clean, structured JSON data.
*   **RSS / Atom Feeds:** Parsing XML syndication feeds published by major news outlets. This provides instantaneous, structured updates whenever new articles are published.
*   **Static HTML Parsing:** Using libraries like `BeautifulSoup` or `trafilatura` to request web pages and extract the main article body while stripping out ads and navigation menus.
*   **Headless Browsing (Dynamic Content):** Using tools like Playwright or Selenium to fully render JavaScript-heavy Single Page Applications (SPAs) before extracting the DOM.

## 2. The Core Scraping Process (Step-by-Step)
1.  **Targeting & Scheduling:** A background job (e.g., APScheduler) triggers scrapers on a defined interval (e.g., every 30 minutes) using specific keywords or location parameters.
2.  **Fetching:** The scraper retrieves the raw payload while handling rate limits and rotating User-Agents to prevent blocks.
3.  **Extraction:** Unnecessary data is stripped away. The system isolates the `title`, `body_content`, `published_date`, and `source_url`.
4.  **Deduplication:** A secure hash (SHA-256) is generated based on the text or URL. If the hash exists in the database, the record is dropped to prevent redundant processing.
5.  **Enrichment (NLP Pipeline):** The clean text is sent through AI models to determine Sentiment, Anger Rating, and categorize the issue (e.g., "Infrastructure", "Health").
6.  **Persistence:** The enriched, structured data is saved to the database (MongoDB) and clustered with related issues.

## 3. Solid Sources for Governance & Issue Data
To maintain high data integrity and avoid "garbage in, garbage out", rely on these trusted sources:
*   **Aggregators & Event Trackers:** 
    *   **GDELT Project:** A massive, free global database of broadcast, print, and web news.
    *   **NewsAPI / MediaStack:** Curated APIs that aggregate headlines from verified publishers.
*   **Official Government Feeds:**
    *   **PIB (Press Information Bureau):** For verified official government announcements and fact-checks.
    *   **Municipal Corporation Portals:** (e.g., BMC, NDMC) for local civic updates.
*   **Direct News Outlets (via RSS):**
    *   The Hindu, Indian Express, NDTV, and Times of India RSS feeds (free, fast, and highly reliable).
*   **Community Forums:**
    *   **Reddit (City Subreddits):** r/Mumbai, r/Delhi, r/Bangalore (excellent for hyper-local civic complaints like potholes or water cuts).

## 4. Categorization of Data by Location
Categorizing unstructured text into actionable geographical coordinates is vital for mapping risks on the dashboard. This is achieved through a multi-layered approach:

*   **Named Entity Recognition (NER):** 
    *   The NLP pipeline uses AI models (like spaCy or DistilBERT) to dynamically identify "Location Entities" (GPE - Geo-Political Entities) within the raw text. For example, identifying "Indore" from the sentence: *"Severe water logging reported in Indore."*
*   **Taxonomy & Keyword Matching:** 
    *   Cross-referencing the extracted text against a static dictionary of Indian States, Districts, and major Cities to ensure a definitive match.
*   **Metadata Extraction:** 
    *   Utilizing location tags provided directly by the source (e.g., a "Mumbai" flair on a Reddit post, or GDELT's embedded location coordinates).
*   **Hierarchical Mapping:** 
    *   Once a location is identified, it is mapped to a strict hierarchy: `Country -> State -> District -> City -> Zone`. 
    *   *Why this matters:* It allows the frontend Risk Map to aggregate hundreds of local ward complaints into a single, high-level severity score for the entire District or State.
