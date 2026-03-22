# JanNetra Backend Startup Script
# Ensures correct PYTHONPATH and environment

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Set PYTHONPATH to the current directory (backend) to allow importing 'app'
$env:PYTHONPATH = $ScriptDir

# --- .env Integrity & Encoding Validation ---
$EnvFile = ".env"
if (Test-Path $EnvFile) {
    # Check for NULL bytes (telltale sign of UTF-16 causing "binary" errors in VS Code)
    $bytes = [System.IO.File]::ReadAllBytes((Get-Item $EnvFile).FullName)
    $hasNulls = $false
    # We skip BOM if present and check first chunk for nulls
    $limit = [Math]::Min($bytes.Length, 1024)
    for ($i=0; $i -lt $limit; $i++) {
        if ($bytes[$i] -eq 0) { $hasNulls = $true; break }
    }

    if ($hasNulls) {
        Write-Host "⚠️ Warning: $EnvFile has malformed encoding (detected null bytes)." -ForegroundColor Yellow
        Write-Host "Self-healing: Converting $EnvFile to UTF-8..." -ForegroundColor Cyan
        try {
            # Read as UTF-16LE or let PowerShell detect, then force write as UTF-8
            $content = Get-Content $EnvFile
            [System.IO.File]::WriteAllLines((Get-Item $EnvFile).FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "✅ Fixed $EnvFile encoding SUCCESS." -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to auto-fix $EnvFile. Error: $_" -ForegroundColor Red
        }
    }
} else {
    if (Test-Path ".env.example") {
        Write-Host "📝 Creating .env from .env.example..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
    }
}
# --------------------------------------------

# Check if venv exists and activate
if (Test-Path ".\venv311\Scripts\activate.ps1") {
    Write-Host "Activating venv311..." -ForegroundColor Cyan
    . .\venv311\Scripts\activate.ps1
}

# Start the API server
Write-Host "Starting JanNetra API (MongoDB mode)..." -ForegroundColor Green
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
