from fastapi import FastAPI
from app.routes import complaints

app = FastAPI()

# ✅ ADD THIS LINE
app.include_router(complaints.router)

@app.get("/")
def health_check():
    return {"status": "ok"}