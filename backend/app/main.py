from fastapi import FastAPI
from app.routes import complaints, analytics   # 👈 ADD analytics here

app = FastAPI()

app.include_router(complaints.router)
app.include_router(analytics.router)   # 👈 ADD THIS LINE

@app.get("/")
def health_check():
    return {"status": "ok"}