@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   MockMate Fresh Restart Script
echo   (Kills all Node processes and restarts)
echo ============================================
echo.

echo [1/5] Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if errorlevel 1 (
  echo   ℹ️  No Node processes running
) else (
  echo   ✅ Node processes killed
)

echo.
echo [2/5] Waiting 2 seconds for cleanup...
timeout /t 2 /nobreak

echo.
echo [3/5] Changing to server directory...
cd /d "%~dp0server"
if errorlevel 1 (
  echo   ❌ Failed to change directory
  pause
  exit /b 1
)
echo   ✅ In server directory

echo.
echo [4/5] Installing dependencies...
npm install >nul 2>&1
if errorlevel 1 (
  echo   ⚠️  npm install had issues, but continuing...
) else (
  echo   ✅ Dependencies ready
)

echo.
echo [5/5] Starting server...
echo.
echo ============================================
echo   🚀 SERVER STARTING...
echo   Watch for: "SERVER READY FOR REQUESTS"
echo ============================================
echo.

npm start

pause
