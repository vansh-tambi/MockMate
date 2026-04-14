@echo off
REM setup-local.bat
REM Local development setup for MockMate with Phi-3 AI (Windows)

setlocal enabledelayedexpansion

echo ================================
echo MockMate Local Setup (Windows)
echo ================================

REM Step 1: Check if Ollama is installed
echo.
echo Step 1: Checking Ollama...
ollama --version >nul 2>&1
if errorlevel 1 (
    echo Ollama not found. Downloading installer...
    powershell -Command "Invoke-WebRequest -Uri 'https://ollama.ai/download/OllamaSetup.exe' -OutFile 'OllamaSetup.exe'"
    echo Please run OllamaSetup.exe and restart this script
    pause
    exit /b 1
) else (
    echo [OK] Ollama is installed
)

REM Step 2: Start Ollama in background
echo.
echo Step 2: Starting Ollama service...
tasklist /FI "IMAGENAME eq ollama.exe" 2>nul | find /I /N "ollama.exe">nul
if errorlevel 1 (
    echo Starting ollama serve...
    start "Ollama" ollama serve
    timeout /t 5 /nobreak
    echo [OK] Ollama started on port 11434
) else (
    echo [OK] Ollama is already running
)

REM Step 3: Pull Phi-3 model
echo.
echo Step 3: Pulling Phi-3 model (3.8GB)...
echo This may take several minutes...
ollama pull phi3
echo [OK] Phi-3 model ready

REM Step 4: Setup Python AI Service
echo.
echo Step 4: Setting up Python AI Service...
cd ai_service

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -q -r requirements.txt
echo [OK] Python dependencies installed

cd ..

REM Step 5: Setup Node.js Server
echo.
echo Step 5: Setting up Node.js Server...
cd server

if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install --silent
    echo [OK] Node dependencies installed
) else (
    echo [OK] Node dependencies already installed
)

cd ..

REM Step 6: Create .env files
echo.
echo Step 6: Checking environment configuration...

if not exist "server\.env" (
    echo Creating server\.env...
    (
        echo PORT=5000
        echo NODE_ENV=development
        echo AI_SERVICE_URL=http://localhost:8000
        echo GEMINI_API_KEY=your_gemini_key_here
    ) > server\.env
    echo [WARNING] Update server\.env with your API keys
)

if not exist "ai_service\.env" (
    echo Creating ai_service\.env...
    (
        echo OLLAMA_BASE_URL=http://localhost:11434
        echo GEMINI_API_KEY=your_gemini_key_here
        echo PORT=8000
    ) > ai_service\.env
)

REM Summary
echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next Steps:
echo.
echo Terminal 1 - Start Ollama:
echo   ollama serve
echo.
echo Terminal 2 - Start AI Service:
echo   cd ai_service
echo   venv\Scripts\activate
echo   python -m uvicorn app:app --host 0.0.0.0 --port 8000
echo.
echo Terminal 3 - Start Server:
echo   cd server
echo   npm start
echo.
echo Test:
echo   http://localhost:5000/api/interview/v2/ai-status
echo.
echo Report any issues!
echo.
pause
