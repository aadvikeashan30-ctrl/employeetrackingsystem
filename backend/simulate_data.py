"""
Simulate attendance data for testing the dashboard.
This script generates realistic attendance data for the past week
so the dashboard has meaningful data to display.
"""

import random
from datetime import datetime, timedelta
from database import init_db, get_all_employees, clock_in, clock_out
import sqlite3
from config import DATABASE_PATH


def simulate_week():
    """Generate a week's worth of realistic attendance data."""
    print("Simulating attendance data for testing...")
    print("=" * 50)

    init_db()
    employees = get_all_employees()

    if not employees:
        print("ERROR: No employees found. Run setup_db.py first!")
        return

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Clear existing attendance data
    cursor.execute("DELETE FROM attendance_logs")
    conn.commit()

    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())

    # Generate data for each day of the current week up to today
    for day_offset in range(today.weekday() + 1):
        current_date = start_of_week + timedelta(days=day_offset)
        date_str = current_date.strftime("%Y-%m-%d")

        print(f"\n  {current_date.strftime('%A, %B %d')}:")

        for emp in employees:
            # 85% chance an employee shows up on any given day
            if random.random() < 0.85:
                # Random check-in between 8:30 AM and 10:00 AM
                check_in_hour = random.randint(8, 9)
                check_in_min = random.randint(0, 59)
                check_in_time = current_date.replace(
                    hour=check_in_hour, minute=check_in_min, second=0
                )

                # Work 7-9 hours
                work_hours = random.uniform(7.0, 9.5)
                work_minutes = work_hours * 60
                check_out_time = check_in_time + timedelta(minutes=work_minutes)

                check_in_str = check_in_time.strftime("%Y-%m-%d %H:%M:%S")
                check_out_str = check_out_time.strftime("%Y-%m-%d %H:%M:%S")

                # If today and still "working", don't add check-out
                is_today = date_str == today.strftime("%Y-%m-%d")
                still_working = is_today and check_out_time > today

                if still_working:
                    cursor.execute(
                        """INSERT INTO attendance_logs (employee_id, check_in_time, date)
                           VALUES (?, ?, ?)""",
                        (emp['id'], check_in_str, date_str)
                    )
                    print(f"    {emp['name']}: IN at {check_in_time.strftime('%H:%M')} (still working)")
                else:
                    cursor.execute(
                        """INSERT INTO attendance_logs (employee_id, check_in_time, check_out_time, duration_minutes, date)
                           VALUES (?, ?, ?, ?, ?)""",
                        (emp['id'], check_in_str, check_out_str, round(work_minutes, 2), date_str)
                    )
                    print(f"    {emp['name']}: {check_in_time.strftime('%H:%M')} - {check_out_time.strftime('%H:%M')} ({work_hours:.1f}h)")
            else:
                print(f"    {emp['name']}: ABSENT")

    conn.commit()
    conn.close()

    print("\n" + "=" * 50)
    print("Simulation complete! The dashboard now has test data.")
    print("Start the API server with: python app.py")


if __name__ == "__main__":
    simulate_week()
