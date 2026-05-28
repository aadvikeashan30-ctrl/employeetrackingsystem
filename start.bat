@echo off
REM Employee Tracking System - Windows Production Start
REM Run this as Administrator for scanner to work

echo =============================================
echo   Employee Tracking System - Production
echo =============================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install from https://www.python.org/downloads/
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Installing backend dependencies...
cd backend
pip install -r requirements.txt --quiet
echo   Done.
echo.

echo [2/3] Installing frontend dependencies...
cd ..\frontend
call npm install --silent
echo   Done.
echo.

echo [3/3] Starting services...
echo.

cd ..\backend
start "Employee Tracker - API" cmd /k "python app.py"
echo   API server started: http://localhost:5000

cd ..\frontend
start "Employee Tracker - Dashboard" cmd /k "npm run dev"
echo   Dashboard started: http://localhost:5173

echo.
echo =============================================
echo   RUNNING! Open http://localhost:5173
echo.
echo   NEXT STEPS:
echo   1. Go to Employees tab
echo   2. Register each employee with their MAC address
echo   3. Open a NEW Admin CMD and run:
echo      cd backend
echo      python scanner.py
echo =============================================
pause
