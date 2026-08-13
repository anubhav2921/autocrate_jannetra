import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.services.data_pipeline import run_pipeline

try:
    print(run_pipeline(city="Prayagraj"))
except Exception as e:
    import traceback
    traceback.print_exc()
