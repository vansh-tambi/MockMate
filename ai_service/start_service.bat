@echo off
cd /d "c:\Users\hp\OneDrive\Desktop\WebDev\Projects\MockMate\ai_service"
"C:/Users/hp/OneDrive/Desktop/WebDev/Projects/MockMate/ai_service/venv/Scripts/python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
