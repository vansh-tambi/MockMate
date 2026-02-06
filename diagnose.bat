@echo off
REM MockMate Staged Progression - Diagnostic Script for Windows
REM Run this to verify the system is set up correctly

echo.
echo 🔍 MockMate System Diagnostic
echo =============================
echo.

REM Check if server is running
echo 1️⃣  Checking if server is running...
curl -s http://localhost:5000/api/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server is running
    echo    Fetching health data...
    curl -s http://localhost:5000/api/health
) else (
    echo ❌ Server is NOT running
    echo    Fix: Run 'npm start' in the server directory
    pause
    exit /b 1
)

echo.
echo 2️⃣  Checking stage configuration...
curl -s http://localhost:5000/api/debug/stages > stages_debug.json
if %errorlevel% equ 0 (
    echo ✅ Stage data loaded
    echo    Check stages_debug.json for details
    type stages_debug.json | findstr "question"
) else (
    echo ❌ Failed to load stage data
    exit /b 1
)

echo.
echo 3️⃣  Testing first question...
curl -s -X POST http://localhost:5000/api/debug/test-question ^
  -H "Content-Type: application/json" ^
  -d "{\"questionIndex\": 0}" > test_question.json
if %errorlevel% equ 0 (
    echo ✅ First question generation works
    type test_question.json | findstr "questionIndex\|stage\|questionsInStage"
) else (
    echo ❌ Question generation failed
    exit /b 1
)

echo.
echo 4️⃣  Testing full Q&A endpoint...
curl -s -X POST http://localhost:5000/api/generate-qa ^
  -H "Content-Type: application/json" ^
  -d "{\"resumeText\": \"I am a software engineer with 3 years of experience\", \"jobDescription\": \"SDE Intern\", \"questionIndex\": 0, \"askedQuestions\": []}" > test_qa.json
if %errorlevel% equ 0 (
    echo ✅ Full Q^&A endpoint works
    type test_qa.json | findstr "success\|stage\|text"
) else (
    echo ❌ Full Q^&A endpoint failed
    exit /b 1
)

echo.
echo ================================
echo ✅ All checks passed! System is ready.
echo.
echo Next steps:
echo 1. Open http://localhost:3000 in browser
echo 2. Upload resume (PDF or text)
echo 3. Enter job role
echo 4. Click 'Start Interview' to begin staged progression
echo.
echo Debug files created:
echo - stages_debug.json
echo - test_question.json
echo - test_qa.json
echo.
pause
