"""
Database module for Employee Tracking System
Handles all SQLite operations for employees and attendance logs
"""

import sqlite3
import os
from datetime import datetime, timedelta
from config import DATABASE_PATH


def get_connection():
    """Create and return a database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            department TEXT,
            mac_address TEXT NOT NULL UNIQUE,
            device_name TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS attendance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            check_in_time TEXT NOT NULL,
            check_out_time TEXT,
            duration_minutes REAL,
            date TEXT NOT NULL,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );

        CREATE TABLE IF NOT EXISTS scan_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_time TEXT NOT NULL,
            devices_found INTEGER DEFAULT 0,
            employees_detected INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance_logs(employee_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date);
        CREATE INDEX IF NOT EXISTS idx_employees_mac ON employees(mac_address);
    """)

    conn.commit()
    conn.close()


def add_employee(name, mac_address, email=None, department=None, device_name=None):
    """Add a new employee to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO employees (name, mac_address, email, department, device_name)
               VALUES (?, ?, ?, ?, ?)""",
            (name, mac_address.lower(), email, department, device_name)
        )
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def get_all_employees():
    """Get all active employees."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE is_active = 1 ORDER BY name")
    employees = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return employees


def get_employee_by_mac(mac_address):
    """Get employee by MAC address."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM employees WHERE mac_address = ? AND is_active = 1",
        (mac_address.lower(),)
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_registered_macs():
    """Get all registered MAC addresses mapped to employee IDs."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, mac_address FROM employees WHERE is_active = 1")
    result = {row['mac_address']: row['id'] for row in cursor.fetchall()}
    conn.close()
    return result


def clock_in(employee_id):
    """Record a clock-in event for an employee."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # Check if already clocked in today without clocking out
    cursor.execute(
        """SELECT id FROM attendance_logs
           WHERE employee_id = ? AND date = ? AND check_out_time IS NULL""",
        (employee_id, today)
    )
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return False  # Already clocked in

    cursor.execute(
        """INSERT INTO attendance_logs (employee_id, check_in_time, date)
           VALUES (?, ?, ?)""",
        (employee_id, time_str, today)
    )
    conn.commit()
    conn.close()
    return True


def clock_out(employee_id):
    """Record a clock-out event for an employee."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # Find the open attendance record for today
    cursor.execute(
        """SELECT id, check_in_time FROM attendance_logs
           WHERE employee_id = ? AND date = ? AND check_out_time IS NULL""",
        (employee_id, today)
    )
    record = cursor.fetchone()

    if not record:
        conn.close()
        return False  # Not clocked in

    # Calculate duration
    check_in_time = datetime.strptime(record['check_in_time'], "%Y-%m-%d %H:%M:%S")
    duration = (now - check_in_time).total_seconds() / 60.0

    cursor.execute(
        """UPDATE attendance_logs
           SET check_out_time = ?, duration_minutes = ?
           WHERE id = ?""",
        (time_str, round(duration, 2), record['id'])
    )
    conn.commit()
    conn.close()
    return True


def get_currently_present():
    """Get employees currently in the office (clocked in, not clocked out)."""
    conn = get_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")

    cursor.execute(
        """SELECT e.id, e.name, e.department, e.device_name, a.check_in_time
           FROM employees e
           JOIN attendance_logs a ON e.id = a.employee_id
           WHERE a.date = ? AND a.check_out_time IS NULL AND e.is_active = 1
           ORDER BY a.check_in_time""",
        (today,)
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_today_attendance():
    """Get all attendance records for today."""
    conn = get_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")

    cursor.execute(
        """SELECT e.id as employee_id, e.name, e.department, e.device_name,
                  a.check_in_time, a.check_out_time, a.duration_minutes
           FROM employees e
           LEFT JOIN attendance_logs a ON e.id = a.employee_id AND a.date = ?
           WHERE e.is_active = 1
           ORDER BY e.name""",
        (today,)
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_attendance_by_date_range(start_date, end_date):
    """Get attendance records for a date range."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """SELECT e.id as employee_id, e.name, e.department,
                  a.date, a.check_in_time, a.check_out_time, a.duration_minutes
           FROM employees e
           JOIN attendance_logs a ON e.id = a.employee_id
           WHERE a.date BETWEEN ? AND ? AND e.is_active = 1
           ORDER BY a.date DESC, e.name""",
        (start_date, end_date)
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_weekly_summary():
    """Get weekly working hours summary for all employees."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get the start of the current week (Monday)
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_date = start_of_week.strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")

    cursor.execute(
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
        (start_date, end_date)
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Convert minutes to hours
    for r in results:
        r['total_hours'] = round(r['total_minutes'] / 60, 2)
        r['avg_hours_per_day'] = round(r['avg_minutes_per_session'] / 60, 2) if r['avg_minutes_per_session'] else 0

    return results


def get_monthly_summary(year, month):
    """Get monthly working hours summary for all employees."""
    conn = get_connection()
    cursor = conn.cursor()

    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"

    cursor.execute(
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
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()

    for r in results:
        r['total_hours'] = round(r['total_minutes'] / 60, 2)
        r['avg_hours_per_day'] = round(r['avg_minutes_per_session'] / 60, 2) if r['avg_minutes_per_session'] else 0

    return results


def log_scan(devices_found, employees_detected):
    """Log a network scan event."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "INSERT INTO scan_logs (scan_time, devices_found, employees_detected) VALUES (?, ?, ?)",
        (now, devices_found, employees_detected)
    )
    conn.commit()
    conn.close()


def delete_employee(employee_id):
    """Soft-delete an employee (mark as inactive)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE employees SET is_active = 0 WHERE id = ?", (employee_id,))
    conn.commit()
    conn.close()


def update_employee(employee_id, name=None, email=None, department=None, mac_address=None, device_name=None):
    """Update employee details."""
    conn = get_connection()
    cursor = conn.cursor()

    updates = []
    values = []
    if name:
        updates.append("name = ?")
        values.append(name)
    if email:
        updates.append("email = ?")
        values.append(email)
    if department:
        updates.append("department = ?")
        values.append(department)
    if mac_address:
        updates.append("mac_address = ?")
        values.append(mac_address.lower())
    if device_name:
        updates.append("device_name = ?")
        values.append(device_name)

    if updates:
        values.append(employee_id)
        cursor.execute(
            f"UPDATE employees SET {', '.join(updates)} WHERE id = ?",
            values
        )
        conn.commit()

    conn.close()
