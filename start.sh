#!/bin/bash
# Employee Tracking System - Quick Start Script
# This script sets up and starts the entire application

echo "============================================="
echo "  Employee Tracking System - Setup & Start"
echo "============================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is required but not installed."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is required but not installed."
    exit 1
fi

echo "[1/5] Installing Python dependencies..."
cd backend
pip install -r requirements.txt --quiet 2>/dev/null || pip3 install -r requirements.txt --quiet 2>/dev/null
echo "  Done."

echo "[2/5] Setting up database with sample employees..."
python3 setup_db.py
echo ""

echo "[3/5] Generating sample attendance data..."
python3 simulate_data.py
echo ""

echo "[4/5] Installing frontend dependencies..."
cd ../frontend
npm install --silent
echo "  Done."
echo ""

echo "[5/5] Starting services..."
echo ""
echo "Starting API server on http://localhost:5000 ..."
cd ../backend
python3 app.py &
API_PID=$!
echo "  API server started (PID: $API_PID)"

echo "Starting frontend on http://localhost:5173 ..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "  Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "============================================="
echo "  All services running!"
echo "  Dashboard:  http://localhost:5173"
echo "  API:        http://localhost:5000"
echo "============================================="
echo ""
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C and kill both processes
trap "echo ''; echo 'Shutting down...'; kill $API_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
