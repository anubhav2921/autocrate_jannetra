from app import firebase_admin_config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    account, alerts, analytics, articles, auth, chatbot,
    citizen_reports, complaints, dashboard, leaderboard,
    location, map_route, pipeline, reports, resolutions,
    scanner, signal_problems, signals, sources, system_monitoring
)


app = FastAPI()

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

# ✅ THEN routers
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
    return {"status": "ok"}