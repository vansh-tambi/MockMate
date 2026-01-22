@echo off
echo Starting MockMate AI Service...
cd /d "%~dp0"
call venv\Scripts\activate.bat
uvicorn app:app --reload --port 8000
