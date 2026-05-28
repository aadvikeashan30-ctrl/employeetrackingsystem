#!/bin/bash
# Employee Tracking System - Production Start (Linux/macOS)
# Run scanner with sudo for ARP privileges

echo "============================================="
echo "  Employee Tracking System - Production"
echo "============================================="
echo ""

if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 required. Install it first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js required. Install from https://nodejs.org/"
    exit 1
fi

echo "[1/3] Installing backend dependencies..."
cd backend
pip3 install -r requirements.txt --quiet 2>/dev/null
echo "  Done."

echo "[2/3] Installing frontend dependencies..."
cd ../frontend
npm install --silent 2>/dev/null
echo "  Done."
echo ""

echo "[3/3] Starting services..."
cd ../backend
python3 app.py &
API_PID=$!
echo "  API: http://localhost:5000 (PID: $API_PID)"

cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "  Dashboard: http://localhost:5173 (PID: $FRONTEND_PID)"

echo ""
echo "============================================="
echo "  RUNNING! Open http://localhost:5173"
echo ""
echo "  NEXT STEPS:"
echo "  1. Register employees in the dashboard"
echo "  2. Start scanner in a new terminal:"
echo "     cd backend && sudo python3 scanner.py"
echo "============================================="
echo ""
echo "Press Ctrl+C to stop."

trap "kill $API_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
