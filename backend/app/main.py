from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import complaints, analytics, auth, reports

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
app.include_router(complaints.router)
app.include_router(analytics.router)
app.include_router(auth.router)
app.include_router(reports.router)

@app.get("/")
def health_check():
    return {"status": "ok"}