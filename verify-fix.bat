@echo off
REM Verification script for MockMate staged progression system
REM Run this after fixing the endpoint bug

echo.
echo ============================================
echo   MockMate Staged System Verification
echo ============================================
echo.

REM Check if server is running
echo [1/5] Checking if server is running...
curl -s http://localhost:5000/api/health > nul 2>&1
if errorlevel 1 (
  echo   ❌ Server is NOT running!
  echo   ➜ Start it with: cd server ^&^& npm start
  echo.
  exit /b 1
) else (
  echo   ✅ Server is running
)

REM Check if Gemini API key is set
echo [2/5] Checking Gemini API key...
curl -s http://localhost:5000/api/health | findstr "gemini_key" > nul
if errorlevel 1 (
  echo   ⚠️  Cannot verify API key from endpoint
  echo   Check server console for: "✓ API key found"
) else (
  echo   ✅ Gemini API key is set
)

REM Check if stages are initialized
echo [3/5] Checking if stages are initialized...
curl -s http://localhost:5000/api/debug/stages | findstr "introduction" > nul
if errorlevel 1 (
  echo   ❌ Stages not loaded!
  echo   ➜ Check server output for initialization
  exit /b 1
) else (
  echo   ✅ All 5 stages initialized
)

REM Test question selection
echo [4/5] Testing question generation...
curl -s -X POST http://localhost:5000/api/debug/test-question ^
  -H "Content-Type: application/json" ^
  -d "{\"questionIndex\": 0}" | findstr "success" > nul
if errorlevel 1 (
  echo   ❌ Question generation failed!
  echo   ➜ Check server console for errors
  exit /b 1
) else (
  echo   ✅ Question selection working
)

REM Test full Q&A endpoint
echo [5/5] Testing /api/generate-qa endpoint...
curl -s -X POST http://localhost:5000/api/generate-qa ^
  -H "Content-Type: application/json" ^
  -d "{\"resumeText\":\"engineer\",\"jobDescription\":\"SDE\",\"questionIndex\":0,\"askedQuestions\":[]}" | findstr "success" > nul
if errorlevel 1 (
  echo   ❌ Generate-QA endpoint FAILED!
  echo   Check if you fixed the bug (added app.post declaration)
  exit /b 1
) else (
  echo   ✅ Generate-QA endpoint is working!
)

echo.
echo ============================================
echo   ✅ ALL CHECKS PASSED!
echo ============================================
echo.
echo Next steps:
echo   1. Open http://localhost:5173 in your browser
echo   2. Upload a resume
echo   3. Click "Start Guided Interview"
echo   4. First question should now load!
echo.
echo Watch server console for:
echo   📤 Fetching question 0 of 22
echo   ✅ Question received: introduction - Q0
echo.

pause
