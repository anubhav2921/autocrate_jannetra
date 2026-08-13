"""
Legacy compatibility alias for database.py

This module redirects all database operations to database.py
(Supabase Collection & Cursor Adapter layer).
"""

from .database import (
    users_collection,
    articles_collection,
    news_articles_collection,
    sources_collection,
    alerts_collection,
    detection_results_collection,
    gri_scores_collection,
    sentiment_records_collection,
    resolutions_collection,
    signal_problems_collection,
    system_metrics_collection,
    community_reviews_collection,
    activity_logs_collection,
    citizen_reports_collection,
    db,
    SupabaseCollectionAdapter,
    SupabaseCursorAdapter,
)

__all__ = [
    "users_collection",
    "articles_collection",
    "news_articles_collection",
    "sources_collection",
    "alerts_collection",
    "detection_results_collection",
    "gri_scores_collection",
    "sentiment_records_collection",
    "resolutions_collection",
    "signal_problems_collection",
    "system_metrics_collection",
    "community_reviews_collection",
    "activity_logs_collection",
    "citizen_reports_collection",
    "db",
    "SupabaseCollectionAdapter",
    "SupabaseCursorAdapter",
]
