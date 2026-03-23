import os
import logging
import sys
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

from app import firebase_admin_config
from app.routes import (
    account, alerts, analytics, articles, auth, chatbot,
    citizen_reports, complaints, dashboard, leaderboard,
    location, map_route, pipeline, reports, resolutions,
    scanner, signal_problems, signals, sources, system_monitoring, workflows
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout
)
logger = logging.getLogger("jannetra.main")
scheduler_logger = logging.getLogger("jannetra.scheduler")

def run_pipeline_job():
    """Scheduled job: runs the full scrape → NLP → cluster pipeline."""
    try:
        scheduler_logger.info("[Scheduler] ▶ Starting scheduled pipeline run...")
        from app.services.data_pipeline import run_pipeline
        result = run_pipeline()
        scheduler_logger.info("[Scheduler] ✅ Pipeline complete: %s", result)
    except Exception as exc:
        scheduler_logger.error("[Scheduler] ❌ Pipeline failed: %s", exc)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup Logic ──────────────────────────────────────────
    logger.info("Initializing JanNetra Backend...")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    logger.info(f"Current Environment: {ENVIRONMENT}")

    # Environment Variables Audit
    required_vars = ["MONGO_URL", "NVIDIA_API_KEY"]
    if ENVIRONMENT == "production":
        missing = [v for v in required_vars if not os.getenv(v) and not os.getenv("MONGO_URI")]
        if missing:
            logger.critical(f"❌ Missing critical environment variables: {missing}")
            # In some platforms, we might want to exit(1) here to fail the deployment
    
    # Initialize Scheduler
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    # 1. Run once immediately on startup (after a 15-second warm-up delay)
    # This ensures that even on cold starts (Render/Railway), data starts moving.
    scheduler.add_job(
        run_pipeline_job, 
        "date", 
        run_date=datetime.now() + timedelta(seconds=3), 
        id="startup_pipeline_job"
    )
    
    # 2. Regular interval: Every 30 minutes
    scheduler.add_job(
        run_pipeline_job, 
        "interval", 
        minutes=30, 
        id="pipeline_job",
        max_instances=1, 
        coalesce=True
    )

    try:
        scheduler.start()
        scheduler_logger.info("✅ APScheduler started — pipeline scheduled every 30 mins.")
    except Exception as exc:
        scheduler_logger.error(f"❌ Failed to start scheduler: {exc}")

    # Seed initial data if empty
    try:
        from app.services.seed_service import seed_if_empty
        await seed_if_empty()
    except Exception as exc:
        logger.error(f"❌ Seed failed: {exc}")

    try:
        yield  # Backend is now serving requests
    finally:
        try:
            if scheduler.running:
                scheduler.shutdown(wait=False)
        except Exception:
            pass
        logger.info("Backend shutting down...")

app = FastAPI(
    title="JanNetra API",
    description="Governance Intelligence & Decision Support System",
    version="1.0.0",
    lifespan=lifespan
)

# Enhanced CORS Configuration
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://autocrate-jannetra.vercel.app",
    "https://jannetra.vercel.app",
]

# Allow all Vercel preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(account.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(articles.router)
app.include_router(auth.router)
app.include_router(chatbot.router)
app.include_router(citizen_reports.router)
app.include_router(complaints.router)
app.include_router(dashboard.router)
app.include_router(leaderboard.router)
app.include_router(location.router)
app.include_router(map_route.router)
app.include_router(pipeline.router)
app.include_router(reports.router)
app.include_router(resolutions.router)
app.include_router(scanner.router)
app.include_router(signal_problems.router)
app.include_router(signals.router)
app.include_router(sources.router)
app.include_router(system_monitoring.router)
app.include_router(workflows.router)

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "scheduler": "active"
    }

@app.get("/api/pipeline/trigger")
async def manual_trigger():
    """Fallback endpoint to trigger pipeline if scheduler fails."""
    logger.info("Manual pipeline trigger requested via API.")
    run_pipeline_job()
    return {"message": "Pipeline execution triggered."}