from fastapi import FastAPI
from app.routes import complaints, analytics, auth

app = FastAPI()

app.include_router(complaints.router)
app.include_router(analytics.router)
app.include_router(auth.router)

@app.get("/")
def health_check():
    return {"status": "ok"}