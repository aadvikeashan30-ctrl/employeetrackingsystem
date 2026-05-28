# Employee Tracking System

A Wi-Fi based employee presence tracking system that detects when employees are in the office by monitoring their device connections to the office network.

## Architecture

```
[Employee Laptop] ──> Connects to Office Wi-Fi
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
[Network Scanner]                           [SQLite Database]
  (Python script)                         (Attendance logs)
  Scans every 5 min                              │
        │                                        ▼
        └──────────> [Flask API Server] ──> [React Dashboard]
```

## Components

1. **Network Scanner** (`backend/scanner.py`) - Python script that scans the local network for registered MAC addresses
2. **API Server** (`backend/app.py`) - Flask REST API serving attendance data
3. **Database** (`backend/database.db`) - SQLite database storing employees and attendance logs
4. **Dashboard** (`frontend/`) - React + Tailwind CSS web dashboard for HR

## Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python setup_db.py          # Initialize database with sample employees
python app.py               # Start API server (port 5000)
python scanner.py           # Start network scanner (run separately)
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev                 # Start dev server (port 5173)
```

## Configuration

Edit `backend/config.py` to set:
- `SCAN_INTERVAL` - How often to scan (default: 300 seconds / 5 minutes)
- `IDLE_THRESHOLD` - Minutes before marking as "left" (default: 15 minutes)
- `NETWORK_SUBNET` - Your office network subnet (default: 192.168.1.0/24)

## How It Works

1. Each employee's device MAC address is registered in the system
2. The scanner pings the local network every 5 minutes using ARP scanning
3. When a registered MAC is detected, the employee is marked as "Checked In"
4. If the MAC disappears for more than 15 minutes, they are marked as "Checked Out"
5. The dashboard shows real-time presence and historical attendance data

## Privacy

- Only tracks network presence (connected/disconnected)
- Does NOT monitor browsing activity, files, or any device content
- Only works within the office network
- Employees are fully aware of the system

## Requirements

- Python 3.8+
- Node.js 16+
- Office Wi-Fi network access
- One always-on computer to run the scanner
