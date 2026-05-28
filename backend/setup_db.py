"""
Setup script to initialize the database with sample employee data.
Run this once when setting up the system for the first time.
"""

from database import init_db, add_employee

# Sample employees - Replace these MAC addresses with your actual employees' MAC addresses
SAMPLE_EMPLOYEES = [
    {
        "name": "Rahul Sharma",
        "email": "rahul.sharma@company.com",
        "department": "Engineering",
        "mac_address": "aa:bb:cc:dd:ee:01",
        "device_name": "Rahul's MacBook Pro"
    },
    {
        "name": "Priya Patel",
        "email": "priya.patel@company.com",
        "department": "Design",
        "mac_address": "aa:bb:cc:dd:ee:02",
        "device_name": "Priya's Dell Laptop"
    },
    {
        "name": "Amit Kumar",
        "email": "amit.kumar@company.com",
        "department": "Engineering",
        "mac_address": "aa:bb:cc:dd:ee:03",
        "device_name": "Amit's ThinkPad"
    },
    {
        "name": "Sneha Gupta",
        "email": "sneha.gupta@company.com",
        "department": "Marketing",
        "mac_address": "aa:bb:cc:dd:ee:04",
        "device_name": "Sneha's HP Laptop"
    },
    {
        "name": "Vikram Singh",
        "email": "vikram.singh@company.com",
        "department": "Engineering",
        "mac_address": "aa:bb:cc:dd:ee:05",
        "device_name": "Vikram's MacBook Air"
    },
    {
        "name": "Ananya Reddy",
        "email": "ananya.reddy@company.com",
        "department": "HR",
        "mac_address": "aa:bb:cc:dd:ee:06",
        "device_name": "Ananya's Surface Pro"
    },
    {
        "name": "Karthik Nair",
        "email": "karthik.nair@company.com",
        "department": "Sales",
        "mac_address": "aa:bb:cc:dd:ee:07",
        "device_name": "Karthik's Lenovo"
    },
    {
        "name": "Divya Iyer",
        "email": "divya.iyer@company.com",
        "department": "Engineering",
        "mac_address": "aa:bb:cc:dd:ee:08",
        "device_name": "Divya's ASUS ROG"
    }
]


def setup():
    """Initialize database and add sample employees."""
    print("Initializing database...")
    init_db()
    print("Database initialized successfully!")
    print()
    print("Adding sample employees...")
    print("-" * 50)

    for emp in SAMPLE_EMPLOYEES:
        emp_id = add_employee(
            name=emp["name"],
            mac_address=emp["mac_address"],
            email=emp["email"],
            department=emp["department"],
            device_name=emp["device_name"]
        )
        if emp_id:
            print(f"  Added: {emp['name']} (MAC: {emp['mac_address']}) - ID: {emp_id}")
        else:
            print(f"  Skipped (already exists): {emp['name']} (MAC: {emp['mac_address']})")

    print("-" * 50)
    print(f"\nSetup complete! {len(SAMPLE_EMPLOYEES)} employees registered.")
    print("\nNext steps:")
    print("  1. Update MAC addresses in this file with real employee devices")
    print("  2. Run 'python app.py' to start the API server")
    print("  3. Run 'python scanner.py' to start the network scanner")


if __name__ == "__main__":
    setup()
