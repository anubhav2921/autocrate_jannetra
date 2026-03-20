from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import complaints, analytics, auth, reports

app = FastAPI()

# ✅ ADD THIS BLOCK
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # temporary fix
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router)
app.include_router(analytics.router)
app.include_router(auth.router)
app.include_router(reports.router)

@app.get("/")
def health_check():
    return {"status": "ok"}