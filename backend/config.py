"""
Configuration for the Employee Tracking System
"""

# Network scanning settings
SCAN_INTERVAL = 300  # Scan every 5 minutes (in seconds)
IDLE_THRESHOLD = 15  # Minutes before marking employee as "left"
NETWORK_SUBNET = "192.168.1.0/24"  # Office network subnet

# Database settings
DATABASE_PATH = "database.db"

# API Server settings
API_HOST = "0.0.0.0"
API_PORT = 5000
DEBUG = True

# CORS settings (frontend URL)
FRONTEND_URL = "http://localhost:5173"
