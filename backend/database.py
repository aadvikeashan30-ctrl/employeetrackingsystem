"""
Production Database Module for Employee Tracking System.
Handles all SQLite operations. No dummy data - all entries come from
real employee registration through the admin dashboard.
"""

import sqlite3
import logging
from datetime import datetime, timedelta
from contextlib import contextmanager
from config import DATABASE_PATH

logger = logging.getLogger(__name__)


@contextmanager
def get_connection():
    """Thread-safe database connection context manager."""
    conn = sqlite3.connect(DATABASE_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database schema. Run once on first startup."""
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                department TEXT,
                mac_address TEXT NOT NULL UNIQUE COLLATE NOCASE,
                device_name TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS attendance_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                check_in_time TEXT NOT NULL,
                check_out_time TEXT,
                duration_minutes REAL,
                date TEXT NOT NULL,
                auto_detected INTEGER DEFAULT 1,
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            );

            CREATE TABLE IF NOT EXISTS scan_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_time TEXT NOT NULL,
                devices_found INTEGER DEFAULT 0,
                employees_detected INTEGER DEFAULT 0,
                scan_duration_ms INTEGER DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
                ON attendance_logs(employee_id, date);
            CREATE INDEX IF NOT EXISTS idx_attendance_date
                ON attendance_logs(date);
            CREATE INDEX IF NOT EXISTS idx_employees_mac
                ON employees(mac_address);
            CREATE INDEX IF NOT EXISTS idx_employees_active
                ON employees(is_active);
            CREATE INDEX IF NOT EXISTS idx_scan_logs_time
                ON scan_logs(scan_time);
        """)
    logger.info("Database initialized successfully")


# ==================== Employee Operations ====================

def add_employee(name, mac_address, email=None, department=None, device_name=None):
    """Register a new employee with their device MAC address."""
    mac_clean = mac_address.strip().lower()
    with get_connection() as conn:
        # Check if MAC exists (including inactive/deleted employees)
        existing = conn.execute(
            "SELECT id, is_active FROM employees WHERE mac_address = ?",
            (mac_clean,)
        ).fetchone()

        if existing:
            if existing['is_active'] == 0:
                # Re-activate previously deleted employee with new details
                conn.execute(
                    """UPDATE employees
                       SET name = ?, email = ?, department = ?, device_name = ?,
                           is_active = 1, updated_at = datetime('now', 'localtime')
                       WHERE id = ?""",
                    (name.strip(), email, department, device_name, existing['id'])
                )
                logger.info(f"Employee re-registered: {name} (MAC: {mac_clean})")
                return existing['id']
            else:
                # MAC is already registered to an active employee
                logger.warning(f"MAC address already in use by active employee: {mac_clean}")
                return None

        # New registration
        cursor = conn.execute(
            """INSERT INTO employees (name, mac_address, email, department, device_name)
               VALUES (?, ?, ?, ?, ?)""",
            (name.strip(), mac_clean, email, department, device_name)
        )
        logger.info(f"Employee registered: {name} (MAC: {mac_clean})")
        return cursor.lastrowid


def get_all_employees():
    """Get all active employees."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM employees WHERE is_active = 1 ORDER BY name"
        ).fetchall()
        return [dict(row) for row in rows]


def get_employee_by_id(employee_id):
    """Get single employee by ID."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM employees WHERE id = ? AND is_active = 1",
            (employee_id,)
        ).fetchone()
        return dict(row) if row else None


def get_registered_macs():
    """Get all registered MAC addresses mapped to employee IDs. Used by scanner."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, mac_address FROM employees WHERE is_active = 1"
        ).fetchall()
        return {row['mac_address'].lower(): row['id'] for row in rows}


def update_employee(employee_id, **kwargs):
    """Update employee details. Only provided fields are updated."""
    allowed_fields = {'name', 'email', 'department', 'mac_address', 'device_name'}
    updates = {k: v for k, v in kwargs.items() if k in allowed_fields and v is not None}

    if not updates:
        return False

    if 'mac_address' in updates:
        updates['mac_address'] = updates['mac_address'].strip().lower()

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [employee_id]

    with get_connection() as conn:
        conn.execute(
            f"UPDATE employees SET {set_clause}, updated_at = datetime('now', 'localtime') WHERE id = ?",
            values
        )
    logger.info(f"Employee {employee_id} updated: {list(updates.keys())}")
    return True


def delete_employee(employee_id):
    """
    Permanently delete employee and their attendance records.
    This allows the same MAC address to be re-registered later.
    """
    with get_connection() as conn:
        # Delete attendance logs for this employee
        conn.execute(
            "DELETE FROM attendance_logs WHERE employee_id = ?",
            (employee_id,)
        )
        # Delete the employee record
        conn.execute(
            "DELETE FROM employees WHERE id = ?",
            (employee_id,)
        )
    logger.info(f"Employee {employee_id} permanently deleted")


# ==================== Attendance Operations ====================

def clock_in(employee_id, auto_detected=True):
    """
    Record clock-in. Returns True if new clock-in recorded.
    Returns False if already clocked in today.
    """
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        # Check if already clocked in today and not clocked out
        existing = conn.execute(
            """SELECT id FROM attendance_logs
               WHERE employee_id = ? AND date = ? AND check_out_time IS NULL""",
            (employee_id, today)
        ).fetchone()

        if existing:
            return False

        conn.execute(
            """INSERT INTO attendance_logs (employee_id, check_in_time, date, auto_detected)
               VALUES (?, ?, ?, ?)""",
            (employee_id, time_str, today, 1 if auto_detected else 0)
        )
    return True


def clock_out(employee_id, auto_detected=True):
    """
    Record clock-out. Calculates duration automatically.
    Returns True if clock-out recorded, False if not currently clocked in.
    """
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%Y-%m-%d %H:%M:%S")

    with get_connection() as conn:
        record = conn.execute(
            """SELECT id, check_in_time FROM attendance_logs
               WHERE employee_id = ? AND date = ? AND check_out_time IS NULL""",
            (employee_id, today)
        ).fetchone()

        if not record:
            return False

        check_in_time = datetime.strptime(record['check_in_time'], "%Y-%m-%d %H:%M:%S")
        duration = (now - check_in_time).total_seconds() / 60.0

        conn.execute(
            """UPDATE attendance_logs
               SET check_out_time = ?, duration_minutes = ?
               WHERE id = ?""",
            (time_str, round(duration, 2), record['id'])
        )
    return True


def get_currently_present():
    """Get employees currently in office (clocked in, not out)."""
    today = datetime.now().strftime("%Y-%m-%d")
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT e.id, e.name, e.department, e.device_name, e.mac_address,
                      a.check_in_time, a.auto_detected
               FROM employees e
               JOIN attendance_logs a ON e.id = a.employee_id
               WHERE a.date = ? AND a.check_out_time IS NULL AND e.is_active = 1
               ORDER BY a.check_in_time""",
            (today,)
        ).fetchall()
        return [dict(row) for row in rows]


def get_today_attendance():
    """Get full attendance status for all employees today."""
    today = datetime.now().strftime("%Y-%m-%d")
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT e.id as employee_id, e.name, e.department, e.device_name,
                      a.check_in_time, a.check_out_time, a.duration_minutes, a.auto_detected
               FROM employees e
               LEFT JOIN attendance_logs a ON e.id = a.employee_id AND a.date = ?
               WHERE e.is_active = 1
               ORDER BY e.name""",
            (today,)
        ).fetchall()
        return [dict(row) for row in rows]


def get_attendance_by_date(date_str):
    """Get attendance for a specific date."""
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT e.id as employee_id, e.name, e.department,
                      a.check_in_time, a.check_out_time, a.duration_minutes
               FROM employees e
               LEFT JOIN attendance_logs a ON e.id = a.employee_id AND a.date = ?
               WHERE e.is_active = 1
               ORDER BY e.name""",
            (date_str,)
        ).fetchall()
        return [dict(row) for row in rows]


def get_attendance_by_date_range(start_date, end_date):
    """Get attendance records between two dates."""
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT e.id as employee_id, e.name, e.department,
                      a.date, a.check_in_time, a.check_out_time, a.duration_minutes
               FROM employees e
               JOIN attendance_logs a ON e.id = a.employee_id
               WHERE a.date BETWEEN ? AND ? AND e.is_active = 1
               ORDER BY a.date DESC, e.name""",
            (start_date, end_date)
        ).fetchall()
        return [dict(row) for row in rows]


def get_weekly_summary():
    """Get current week working hours summary per employee."""
    today = datetime.now()
    start_of_week = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")

    with get_connection() as conn:
        rows = conn.execute(
            """SELECT e.id as employee_id, e.name, e.department,
                      COUNT(DISTINCT a.date) as days_present,
                      COALESCE(SUM(a.duration_minutes), 0) as total_minutes,
                      COALESCE(AVG(a.duration_minutes), 0) as avg_minutes_per_session
               FROM employees e
               LEFT JOIN attendance_logs a ON e.id = a.employee_id
                    AND a.date BETWEEN ? AND ?
                    AND a.duration_minutes IS NOT NULL
               WHERE e.is_active = 1
               GROUP BY e.id
               ORDER BY total_minutes DESC""",
            (start_of_week, end_date)
        ).fetchall()

    results = [dict(row) for row in rows]
    for r in results:
        r['total_hours'] = round(r['total_minutes'] / 60, 2)
        r['avg_hours_per_day'] = round(r['avg_minutes_per_session'] / 60, 2) if r['avg_minutes_per_session'] else 0
    return results


def get_monthly_summary(year, month):
    """Get monthly working hours summary per employee."""
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"

    with get_connection() as conn:
        rows = conn.execute(
            """SELECT e.id as employee_id, e.name, e.department,
                      COUNT(DISTINCT a.date) as days_present,
                      COALESCE(SUM(a.duration_minutes), 0) as total_minutes,
                      COALESCE(AVG(a.duration_minutes), 0) as avg_minutes_per_session
               FROM employees e
               LEFT JOIN attendance_logs a ON e.id = a.employee_id
                    AND a.date >= ? AND a.date < ?
                    AND a.duration_minutes IS NOT NULL
               WHERE e.is_active = 1
               GROUP BY e.id
               ORDER BY total_minutes DESC""",
            (start_date, end_date)
        ).fetchall()

    results = [dict(row) for row in rows]
    for r in results:
        r['total_hours'] = round(r['total_minutes'] / 60, 2)
        r['avg_hours_per_day'] = round(r['avg_minutes_per_session'] / 60, 2) if r['avg_minutes_per_session'] else 0
    return results


# ==================== Scan Log Operations ====================

def log_scan(devices_found, employees_detected, scan_duration_ms=0):
    """Log each network scan event for auditing."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO scan_logs (scan_time, devices_found, employees_detected, scan_duration_ms)
               VALUES (?, ?, ?, ?)""",
            (now, devices_found, employees_detected, scan_duration_ms)
        )


def get_scan_stats():
    """Get scanner health statistics."""
    with get_connection() as conn:
        row = conn.execute(
            """SELECT COUNT(*) as total_scans,
                      MAX(scan_time) as last_scan,
                      AVG(employees_detected) as avg_detected,
                      AVG(scan_duration_ms) as avg_duration_ms
               FROM scan_logs
               WHERE scan_time >= datetime('now', '-24 hours', 'localtime')"""
        ).fetchone()
        return dict(row) if row else {}
