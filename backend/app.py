"""
Flask API Server for Employee Tracking System
Serves REST API endpoints for the frontend dashboard
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
from config import API_HOST, API_PORT, DEBUG, FRONTEND_URL
from database import (
    init_db, add_employee, get_all_employees, get_currently_present,
    get_today_attendance, get_weekly_summary, get_monthly_summary,
    get_attendance_by_date_range, delete_employee, update_employee,
    clock_in, clock_out
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["*"]}})


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Employee Tracking System API"
    })


# ==================== Employee Endpoints ====================

@app.route("/api/employees", methods=["GET"])
def list_employees():
    """Get all active employees."""
    employees = get_all_employees()
    return jsonify({"employees": employees, "count": len(employees)})


@app.route("/api/employees", methods=["POST"])
def create_employee():
    """Add a new employee."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name")
    mac_address = data.get("mac_address")

    if not name or not mac_address:
        return jsonify({"error": "Name and MAC address are required"}), 400

    # Validate MAC address format
    import re
    mac_pattern = re.compile(r'^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$')
    if not mac_pattern.match(mac_address):
        return jsonify({"error": "Invalid MAC address format. Use format: aa:bb:cc:dd:ee:ff"}), 400

    employee_id = add_employee(
        name=name,
        mac_address=mac_address,
        email=data.get("email"),
        department=data.get("department"),
        device_name=data.get("device_name")
    )

    if employee_id is None:
        return jsonify({"error": "MAC address already registered"}), 409

    return jsonify({"id": employee_id, "message": "Employee added successfully"}), 201


@app.route("/api/employees/<int:employee_id>", methods=["PUT"])
def modify_employee(employee_id):
    """Update employee details."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

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
    """Deactivate an employee."""
    delete_employee(employee_id)
    return jsonify({"message": "Employee deactivated successfully"})


# ==================== Attendance Endpoints ====================

@app.route("/api/attendance/present", methods=["GET"])
def present_now():
    """Get employees currently in the office."""
    present = get_currently_present()
    now = datetime.now()

    # Calculate time since check-in for each employee
    for emp in present:
        check_in = datetime.strptime(emp['check_in_time'], "%Y-%m-%d %H:%M:%S")
        delta = now - check_in
        hours = int(delta.total_seconds() // 3600)
        minutes = int((delta.total_seconds() % 3600) // 60)
        emp['duration_display'] = f"{hours}h {minutes}m"

    return jsonify({
        "present": present,
        "count": len(present),
        "timestamp": now.isoformat()
    })


@app.route("/api/attendance/today", methods=["GET"])
def today_attendance():
    """Get today's attendance records."""
    records = get_today_attendance()
    return jsonify({
        "attendance": records,
        "date": datetime.now().strftime("%Y-%m-%d")
    })


@app.route("/api/attendance/range", methods=["GET"])
def attendance_range():
    """Get attendance for a date range."""
    start = request.args.get("start")
    end = request.args.get("end")

    if not start or not end:
        return jsonify({"error": "start and end dates are required (YYYY-MM-DD)"}), 400

    records = get_attendance_by_date_range(start, end)
    return jsonify({"attendance": records, "start": start, "end": end})


# ==================== Summary Endpoints ====================

@app.route("/api/summary/weekly", methods=["GET"])
def weekly():
    """Get weekly summary of working hours."""
    summary = get_weekly_summary()
    return jsonify({"summary": summary, "period": "current_week"})


@app.route("/api/summary/monthly", methods=["GET"])
def monthly():
    """Get monthly summary of working hours."""
    year = request.args.get("year", datetime.now().year, type=int)
    month = request.args.get("month", datetime.now().month, type=int)

    if month < 1 or month > 12:
        return jsonify({"error": "Month must be between 1 and 12"}), 400

    summary = get_monthly_summary(year, month)
    return jsonify({"summary": summary, "year": year, "month": month})


# ==================== Manual Clock In/Out (for testing) ====================

@app.route("/api/attendance/clockin/<int:employee_id>", methods=["POST"])
def manual_clock_in(employee_id):
    """Manually clock in an employee (for testing/manual override)."""
    success = clock_in(employee_id)
    if success:
        return jsonify({"message": "Clocked in successfully"})
    else:
        return jsonify({"message": "Already clocked in"}), 200


@app.route("/api/attendance/clockout/<int:employee_id>", methods=["POST"])
def manual_clock_out(employee_id):
    """Manually clock out an employee (for testing/manual override)."""
    success = clock_out(employee_id)
    if success:
        return jsonify({"message": "Clocked out successfully"})
    else:
        return jsonify({"message": "Not currently clocked in"}), 200


# ==================== Dashboard Stats ====================

@app.route("/api/stats", methods=["GET"])
def dashboard_stats():
    """Get dashboard overview statistics."""
    employees = get_all_employees()
    present = get_currently_present()
    weekly_data = get_weekly_summary()

    total_hours_this_week = sum(e.get('total_hours', 0) for e in weekly_data)
    avg_hours = total_hours_this_week / len(employees) if employees else 0

    return jsonify({
        "total_employees": len(employees),
        "currently_present": len(present),
        "absent_today": len(employees) - len(present),
        "total_hours_this_week": round(total_hours_this_week, 1),
        "avg_hours_per_employee": round(avg_hours, 1),
        "timestamp": datetime.now().isoformat()
    })


if __name__ == "__main__":
    init_db()
    print("=" * 60)
    print("Employee Tracking System - API Server")
    print(f"Running on http://{API_HOST}:{API_PORT}")
    print("=" * 60)
    app.run(host=API_HOST, port=API_PORT, debug=DEBUG)
