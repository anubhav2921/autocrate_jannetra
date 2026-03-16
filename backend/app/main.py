"""
JanNetra Backend Entrypoint
"""

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# API Routes
from app.routes import (
    auth, dashboard, articles, alerts, analytics, sources, resolutions,
    map_route, leaderboard, chatbot, scanner, signal_problems,
    system_monitoring, reports, account, complaints, pipeline, location
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("jannetra")

scheduler = BackgroundScheduler(daemon=True)


def run_scheduled_pipeline():
    """Trigger the data ingestion pipeline periodically."""
    from app.services.data_pipeline import run_pipeline
    try:
        logger.info("Triggering scheduled data pipeline...")
        result = run_pipeline()
        logger.info(
            f"Pipeline complete - scraped: {result.get('total_scraped', 0)}, "
            f"stored: {result.get('total_stored', 0)} in {result.get('elapsed_seconds', '?')}s"
        )
    except Exception as e:
        logger.error(f"Scheduled pipeline failed: {e}")


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    logger.info("JanNetra backend starting up (MongoDB mode)...")

    # Start the background pipeline scheduler (runs every 30m)
    scheduler.add_job(
        run_scheduled_pipeline,
        trigger=IntervalTrigger(minutes=30),
        id="data_pipeline",
        name="jannetra-pipeline",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("Scheduler started.")

    # Kick off an initial pipeline run in background
    threading.Thread(
        target=run_scheduled_pipeline,
        name="initial-pipeline-run",
        daemon=True,
    ).start()

    yield

    logger.info("Shutting down scheduler...")
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="JanNetra API",
    description="Predictive Governance Intelligence API",
    version="3.0.0",
    lifespan=app_lifespan,
)

# Set up CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
routers = [
    auth.router, dashboard.router, articles.router, alerts.router,
    analytics.router, sources.router, resolutions.router, map_route.router,
    leaderboard.router, chatbot.router, scanner.router, signal_problems.router,
    system_monitoring.router, reports.router, account.router,
    complaints.router, pipeline.router, location.router
]

for router in routers:
    app.include_router(router)


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "message": "JanNetra API is running (MongoDB backend).",
        "version": "3.0.0",
    }
