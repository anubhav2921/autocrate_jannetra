import logging
import sys

# Set up logging for stdout so we can see output
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

from app.services.data_pipeline import run_pipeline

if __name__ == '__main__':
    result = run_pipeline()
    print("Pipeline result:", result)
