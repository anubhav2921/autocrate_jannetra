FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install necessary build dependencies
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the backend code
COPY backend/ .

# Run the FastAPI app (Railway passes the $PORT env variable)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
