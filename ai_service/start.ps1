# MockMate AI Service Startup Script

$ErrorActionPreference = "Stop"

Write-Host "🤖 Starting MockMate AI Service..." -ForegroundColor Cyan
Write-Host ""

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "   Create it with: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Activate venv and start service
Write-Host "✅ Virtual environment found" -ForegroundColor Green
Write-Host "🚀 Starting uvicorn server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

& "venv\Scripts\Activate.ps1"
uvicorn app:app --reload --port 8000
