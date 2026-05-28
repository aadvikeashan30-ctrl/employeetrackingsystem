# Employee Tracking System (Production)

Live Wi-Fi based attendance tracking. Detects employee devices on the office network and automatically logs check-in/check-out times.

**No dummy data. No fake entries. Register your real employees and start tracking.**

## How It Works

```
Employee opens laptop → Connects to office Wi-Fi
         ↓
Scanner detects MAC address on network (every 5 min)
         ↓
System logs: "Checked In at 09:02 AM"
         ↓
Laptop disconnects (leaves / closes lid)
         ↓
After 15 min idle → System logs: "Checked Out at 05:45 PM"
```

## Setup (Windows)

### 1. Install Prerequisites
- Python 3.8+ → https://www.python.org/downloads/
- Node.js 20+ → https://nodejs.org/

### 2. Install Dependencies
```powershell
cd backend
pip install -r requirements.txt

cd ..\frontend
npm install
```

### 3. Configure Network (Important!)
Edit `backend/.env`:
```
NETWORK_SUBNET=192.168.1.0/24    ← Change to YOUR office subnet
SCAN_INTERVAL_SECONDS=300         ← Scan every 5 minutes
IDLE_THRESHOLD_MINUTES=15         ← Mark as left after 15 min
```

### 4. Start the System
```powershell
# Terminal 1: API Server
cd backend
python app.py

# Terminal 2: Dashboard
cd frontend
npm run dev

# Terminal 3: Scanner (Run as Administrator!)
cd backend
python scanner.py
```

### 5. Register Employees
1. Open http://localhost:5173
2. Go to **Employees** tab
3. Click **Register Employee**
4. Enter name + their laptop's MAC address
5. Done! The scanner will track them automatically.

## Finding MAC Addresses

| OS | Command |
|----|---------|
| Windows | `ipconfig /all` → Wi-Fi "Physical Address" |
| macOS | System Settings → Network → Wi-Fi → Details → MAC Address |
| Linux | `ip link show` → wlan0 link/ether |

Format: `a4:83:e7:2b:1f:00` (lowercase, colons)

## Architecture

```
backend/
├── app.py          ← Flask API server
├── scanner.py      ← Network scanner (ARP)
├── database.py     ← SQLite operations
├── config.py       ← Loads from .env
├── .env            ← Your configuration
└── data/           ← Database file (auto-created)

frontend/
├── src/pages/
│   ├── Dashboard.jsx   ← Live presence view
│   ├── Employees.jsx   ← Register/manage employees
│   ├── Attendance.jsx  ← Daily records + manual override
│   └── Reports.jsx     ← Weekly/monthly hours
└── ...
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | System + scanner status |
| GET | /api/stats | Dashboard overview |
| GET/POST | /api/employees | List / Register employees |
| PUT/DELETE | /api/employees/:id | Update / Remove |
| GET | /api/attendance/present | Who is in office NOW |
| GET | /api/attendance/today | Today's full log |
| POST | /api/attendance/clockin/:id | Manual clock in |
| POST | /api/attendance/clockout/:id | Manual clock out |
| GET | /api/summary/weekly | This week's hours |
| GET | /api/summary/monthly | Monthly hours |

## Privacy

- Only detects if device is connected (yes/no)
- Cannot see browsing, files, or activity
- Only works inside office network
- Employees should be informed
