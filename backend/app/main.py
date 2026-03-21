from app import firebase_admin_config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
import logging

from app.routes import (
    account, alerts, analytics, articles, auth, chatbot,
    citizen_reports, complaints, dashboard, leaderboard,
    location, map_route, pipeline, reports, resolutions,
    scanner, signal_problems, signals, sources, system_monitoring
)

logger = logging.getLogger("jannetra.scheduler")


def run_pipeline_job():
    """Scheduled job: runs the full scrape → NLP → cluster pipeline."""
    try:
        logger.info("[Scheduler] ▶ Starting scheduled pipeline run...")
        from app.services.data_pipeline import run_pipeline
        result = run_pipeline()
        logger.info("[Scheduler] ✅ Pipeline complete: %s", result)
    except Exception as exc:
        logger.error("[Scheduler] ❌ Pipeline failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    # Run once immediately on startup (after a 10-second warm-up delay)
    scheduler.add_job(run_pipeline_job, "interval", minutes=30, id="pipeline_job",
                      max_instances=1, coalesce=True)

    scheduler.start()
    logger.info("[Scheduler] ✅ APScheduler started — pipeline runs every 30 minutes.")

    yield  # App is running

    # ── Shutdown ─────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    logger.info("[Scheduler] Stopped.")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://autocrate-jannetra.vercel.app"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/")
def health_check():
    return {"status": "ok", "scheduler": "running — pipeline every 30 min"}