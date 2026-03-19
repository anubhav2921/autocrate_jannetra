
import sys
import os
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.data_pipeline import run_pipeline

print(f"[{datetime.now()}] Starting Aggregated Pipeline Run...")
try:
    result = run_pipeline()
    print(f"[{datetime.now()}] Pipeline Success!")
    print(result)
except Exception as e:
    print(f"[{datetime.now()}] Pipeline Failed: {e}")
