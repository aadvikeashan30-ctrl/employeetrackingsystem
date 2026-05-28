"""
Production Configuration - Loaded from environment variables (.env file)
No hardcoded values. All settings come from .env
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent.resolve()

# Network scanning
NETWORK_SUBNET = os.getenv("NETWORK_SUBNET", "192.168.1.0/24")
SCAN_INTERVAL_SECONDS = int(os.getenv("SCAN_INTERVAL_SECONDS", "300"))
IDLE_THRESHOLD_MINUTES = int(os.getenv("IDLE_THRESHOLD_MINUTES", "15"))

# API Server
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "5000"))
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")

# Database
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "attendance.db"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", str(BASE_DIR / "logs" / "tracker.log"))

# Ensure required directories exist
os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
