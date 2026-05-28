"""
Production Flask API Server for Employee Tracking System.
All data comes from real employee registrations - no dummy/sample data.
"""

import re
import logging
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import API_HOST, API_PORT, SECRET_KEY, LOG_LEVEL, LOG_FILE
from database import (
    init_db, add_employee, get_all_employees, get_employee_by_id,
    get_currently_present, get_today_attendance, get_attendance_by_date,
    get_attendance_by_date_range, get_weekly_summary, get_monthly_summary,
    delete_employee, update_employee, clock_in, clock_out, get_scan_stats
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("api")

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
CORS(app, resources={r"/api/*": {"origins": ["*"]}})

# MAC address validation regex
MAC_REGEX = re.compile(r'^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$')


def validate_mac(mac_address):
    """Validate MAC address format."""
    return bool(MAC_REGEX.match(mac_address))


# ==================== Health & Status ====================

@app.route("/api/health", methods=["GET"])
def health_check():
    """System health check."""
    scan_stats = get_scan_stats()
    return jsonify({
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "scanner": {
            "last_scan": scan_stats.get("last_scan"),
            "scans_last_24h": scan_stats.get("total_scans", 0),
            "avg_duration_ms": round(scan_stats.get("avg_duration_ms") or 0)
        }
    })


@app.route("/api/stats", methods=["GET"])
def dashboard_stats():
    """Dashboard overview statistics."""
    employees = get_all_employees()
    present = get_currently_present()
    weekly = get_weekly_summary()

    total_hours = sum(e.get('total_hours', 0) for e in weekly)
    avg_hours = total_hours / len(employees) if employees else 0

    return jsonify({
        "total_employees": len(employees),
        "currently_present": len(present),
        "absent_today": len(employees) - len(present),
        "total_hours_this_week": round(total_hours, 1),
        "avg_hours_per_employee": round(avg_hours, 1),
        "timestamp": datetime.now().isoformat()
    })


# ==================== Employee Management ====================

@app.route("/api/employees", methods=["GET"])
def list_employees():
    """List all active registered employees."""
    employees = get_all_employees()
    return jsonify({"employees": employees, "count": len(employees)})


@app.route("/api/employees/<int:employee_id>", methods=["GET"])
def get_employee(employee_id):
    """Get single employee details."""
    emp = get_employee_by_id(employee_id)
    if not emp:
        return jsonify({"error": "Employee not found"}), 404
    return jsonify(emp)


@app.route("/api/employees", methods=["POST"])
def create_employee():
    """
    Register a new employee with their device MAC address.
    This is how you add real employees to the tracking system.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    name = (data.get("name") or "").strip()
    mac_address = (data.get("mac_address") or "").strip()

    # Validation
    if not name:
        return jsonify({"error": "Employee name is required"}), 400
    if len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400
    if not mac_address:
        return jsonify({"error": "MAC address is required"}), 400
    if not validate_mac(mac_address):
        return jsonify({"error": "Invalid MAC address format. Use: aa:bb:cc:dd:ee:ff"}), 400

    email = (data.get("email") or "").strip() or None
    department = (data.get("department") or "").strip() or None
    device_name = (data.get("device_name") or "").strip() or None

    employee_id = add_employee(
        name=name,
        mac_address=mac_address,
        email=email,
        department=department,
        device_name=device_name
    )

    if employee_id is None:
        return jsonify({"error": "This MAC address is already registered to another employee"}), 409

    logger.info(f"New employee registered: {name} (MAC: {mac_address})")
    return jsonify({
        "id": employee_id,
        "message": f"Employee '{name}' registered successfully. Their device will be tracked automatically."
    }), 201


@app.route("/api/employees/<int:employee_id>", methods=["PUT"])
def modify_employee(employee_id):
    """Update employee details (name, MAC, department, etc.)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    # Validate MAC if provided
    mac = data.get("mac_address")
    if mac and not validate_mac(mac):
        return jsonify({"error": "Invalid MAC address format. Use: aa:bb:cc:dd:ee:ff"}), 400

    emp = get_employee_by_id(employee_id)
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    update_employee(
        employee_id,
        name=data.get("name"),
        email=data.get("email"),
        department=data.get("department"),
        mac_address=data.get("mac_address"),
        device_name=data.get("device_name")
    )

    return jsonify({"message": "Employee updated successfully"})


@app.route("/api/employees/<int:employee_id>", methods=["DELETE"])
def remove_employee(employee_id):
    """Remove employee from tracking (soft delete - history preserved)."""
    emp = get_employee_by_id(employee_id)
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    delete_employee(employee_id)
    logger.info(f"Employee removed: {emp['name']} (ID: {employee_id})")
    return jsonify({"message": f"Employee '{emp['name']}' removed from tracking"})


# ==================== Live Attendance ====================

@app.route("/api/attendance/present", methods=["GET"])
def currently_present():
    """Get employees currently detected in office (live status)."""
    present = get_currently_present()
    now = datetime.now()

    for emp in present:
        check_in = datetime.strptime(emp['check_in_time'], "%Y-%m-%d %H:%M:%S")
        delta = now - check_in
        hours = int(delta.total_seconds() // 3600)
        minutes = int((delta.total_seconds() % 3600) // 60)
        emp['duration_display'] = f"{hours}h {minutes}m"
        emp['checked_in_since'] = emp['check_in_time']

    return jsonify({
        "present": present,
        "count": len(present),
        "timestamp": now.isoformat()
    })


@app.route("/api/attendance/today", methods=["GET"])
def today():
    """Today's attendance for all employees."""
    records = get_today_attendance()
    return jsonify({
        "attendance": records,
        "date": datetime.now().strftime("%Y-%m-%d")
    })


@app.route("/api/attendance/date/<date_str>", methods=["GET"])
def attendance_by_date(date_str):
    """Get attendance for a specific date (YYYY-MM-DD)."""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    records = get_attendance_by_date(date_str)
    return jsonify({"attendance": records, "date": date_str})


@app.route("/api/attendance/range", methods=["GET"])
def attendance_range():
    """Get attendance for a date range."""
    start = request.args.get("start")
    end = request.args.get("end")

    if not start or not end:
        return jsonify({"error": "start and end query parameters required (YYYY-MM-DD)"}), 400

    try:
        datetime.strptime(start, "%Y-%m-%d")
        datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    records = get_attendance_by_date_range(start, end)
    return jsonify({"attendance": records, "start": start, "end": end})


# ==================== Manual Override ====================

@app.route("/api/attendance/clockin/<int:employee_id>", methods=["POST"])
def manual_clock_in(employee_id):
    """Manually clock in an employee (for manual override when scanner misses)."""
    emp = get_employee_by_id(employee_id)
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    success = clock_in(employee_id, auto_detected=False)
    if success:
        logger.info(f"Manual clock-in: {emp['name']} (ID: {employee_id})")
        return jsonify({"message": f"{emp['name']} clocked in manually"})
    return jsonify({"message": f"{emp['name']} is already clocked in"}), 200


@app.route("/api/attendance/clockout/<int:employee_id>", methods=["POST"])
def manual_clock_out(employee_id):
    """Manually clock out an employee."""
    emp = get_employee_by_id(employee_id)
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    success = clock_out(employee_id, auto_detected=False)
    if success:
        logger.info(f"Manual clock-out: {emp['name']} (ID: {employee_id})")
        return jsonify({"message": f"{emp['name']} clocked out manually"})
    return jsonify({"message": f"{emp['name']} is not currently clocked in"}), 200


# ==================== Reports ====================

@app.route("/api/summary/weekly", methods=["GET"])
def weekly_summary():
    """Current week working hours per employee."""
    summary = get_weekly_summary()
    return jsonify({"summary": summary, "period": "current_week"})


@app.route("/api/summary/monthly", methods=["GET"])
def monthly_summary():
    """Monthly working hours per employee."""
    year = request.args.get("year", datetime.now().year, type=int)
    month = request.args.get("month", datetime.now().month, type=int)

    if month < 1 or month > 12:
        return jsonify({"error": "Month must be between 1 and 12"}), 400

    summary = get_monthly_summary(year, month)
    return jsonify({"summary": summary, "year": year, "month": month})


# ==================== Application Startup ====================

if __name__ == "__main__":
    # Initialize database
    init_db()

    logger.info("=" * 60)
    logger.info("EMPLOYEE TRACKING SYSTEM - API SERVER")
    logger.info(f"  URL: http://{API_HOST}:{API_PORT}")
    logger.info(f"  Mode: PRODUCTION")
    logger.info("=" * 60)
    logger.info("")
    logger.info("  SETUP INSTRUCTIONS:")
    logger.info("  1. Open http://localhost:5173 in your browser")
    logger.info("  2. Go to 'Employees' tab")
    logger.info("  3. Register each employee with their real MAC address")
    logger.info("  4. Start the scanner: python scanner.py (as Administrator)")
    logger.info("  5. The system will automatically track attendance")
    logger.info("")

    app.run(host=API_HOST, port=API_PORT, debug=False)
