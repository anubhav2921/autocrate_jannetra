# JanNetra Backend Startup Script
# Ensures correct PYTHONPATH and environment

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Set PYTHONPATH to the current directory (backend) to allow importing 'app'
$env:PYTHONPATH = $ScriptDir

# Check if venv exists and activate
if (Test-Path ".\venv311\Scripts\activate.ps1") {
    Write-Host "Activating venv311..." -ForegroundColor Cyan
    . .\venv311\Scripts\activate.ps1
}

# Start the API server
Write-Host "Starting JanNetra API (MongoDB mode)..." -ForegroundColor Green
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
