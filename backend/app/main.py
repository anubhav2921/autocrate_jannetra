"""
JanNetra — Predictive Governance Intelligence & Decision Support System
═══════════════════════════════════════════════════════════════════════
FastAPI backend entry-point.  Registers every route module, creates
all DB tables on startup, and launches the automated data pipeline.

Start command (from backend/):
    venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base

# ── Route modules ────────────────────────────────────────────────────
from app.routes import (
    auth,
    dashboard,
    articles,
    alerts,
    analytics,
    sources,
    resolutions,
    map_route,
    leaderboard,
    chatbot,
    scanner,
    signal_problems,
    system_monitoring,
    reports,
    account,
    complaints,
    pipeline,
)

# ── Logging config ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("jannetra")

# ── Scheduler (APScheduler) ──────────────────────────────────────────
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = BackgroundScheduler(daemon=True)


def _scheduled_pipeline_job():
    """Run the data ingestion pipeline (called by APScheduler)."""
    from app.services.data_pipeline import run_pipeline
    try:
        logger.info("[Scheduler] ⏰ Triggering scheduled data pipeline...")
        result = run_pipeline()
        logger.info(
            "[Scheduler] ✅ Pipeline complete — scraped: %d, stored: %d, elapsed: %ss",
            result.get("total_scraped", 0),
            result.get("total_stored", 0),
            result.get("elapsed_seconds", "?"),
        )
    except Exception as e:
        logger.error("[Scheduler] ❌ Scheduled pipeline failed: %s", e)


# ── Create tables ────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)


# ── Lifespan (startup + shutdown) ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the scheduler on startup, shut it down on exit."""
    logger.info("=" * 60)
    logger.info("[Startup] JanNetra backend starting...")
    logger.info("[Startup] Registering data pipeline scheduler (every 30 min)...")

    scheduler.add_job(
        _scheduled_pipeline_job,
        trigger=IntervalTrigger(minutes=30),
        id="data_pipeline",
        name="JanNetra Data Pipeline",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("[Startup] ✅ Scheduler started — next run in 30 minutes")

    # Run pipeline once at startup (async-safe — runs in background thread)
    import threading
    threading.Thread(
        target=_scheduled_pipeline_job,
        name="initial-pipeline",
        daemon=True,
    ).start()
    logger.info("[Startup] ▶ Initial pipeline run triggered in background")
    logger.info("=" * 60)

    yield  # ← App is running

    logger.info("[Shutdown] Shutting down scheduler...")
    scheduler.shutdown(wait=False)
    logger.info("[Shutdown] ✅ Scheduler stopped")


# ── App instance ─────────────────────────────────────────────────────
app = FastAPI(
    title="JanNetra API",
    description="Predictive Governance Intelligence & Decision Support System",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS — allow the Vite dev-server and production origin ───────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000",   # fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register every router ───────────────────────────────────────────
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(articles.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(sources.router)
app.include_router(resolutions.router)
app.include_router(map_route.router)
app.include_router(leaderboard.router)
app.include_router(chatbot.router)
app.include_router(scanner.router)
app.include_router(signal_problems.router)
app.include_router(system_monitoring.router)
app.include_router(reports.router)
app.include_router(account.router)
app.include_router(complaints.router)
app.include_router(pipeline.router)


# ── Health-check root ────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "JanNetra backend is running successfully",
        "version": "2.0.0",
        "features": [
            "Automated data pipeline (every 30 min)",
            "RSS scraping (8 Indian news feeds)",
            "NewsAPI + GDELT integration",
            "Government portal scraping (PIB, data.gov.in)",
            "Real-time NLP analysis",
            "Fake news detection",
            "Governance Risk Index (GRI)",
        ],
    }
