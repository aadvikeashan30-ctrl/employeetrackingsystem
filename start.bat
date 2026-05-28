@echo off
REM Employee Tracking System - Windows Quick Start Script

echo =============================================
echo   Employee Tracking System - Setup ^& Start
echo =============================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is required but not installed.
    echo Download from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is required but not installed.
    echo Download from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Installing Python dependencies...
cd backend
pip install -r requirements.txt --quiet
echo   Done.

echo [2/5] Setting up database with sample employees...
python setup_db.py
echo.

echo [3/5] Generating sample attendance data...
python simulate_data.py
echo.

echo [4/5] Installing frontend dependencies...
cd ..\frontend
call npm install --silent
echo   Done.
echo.

echo [5/5] Starting services...
echo.

echo Starting API server on http://localhost:5000 ...
cd ..\backend
start "API Server" cmd /k python app.py

echo Starting frontend on http://localhost:5173 ...
cd ..\frontend
start "Frontend" cmd /k npm run dev

echo.
echo =============================================
echo   All services running!
echo   Dashboard:  http://localhost:5173
echo   API:        http://localhost:5000
echo =============================================
echo.
echo Close the opened terminal windows to stop services.
pause
