"""
Network Scanner for Employee Tracking System
Scans the local network for registered MAC addresses using ARP.
Runs as a background service with configurable intervals.
"""

import time
import subprocess
import re
import platform
import logging
from datetime import datetime
from config import SCAN_INTERVAL, IDLE_THRESHOLD, NETWORK_SUBNET
from database import (
    get_registered_macs, clock_in, clock_out,
    get_currently_present, log_scan, init_db
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scanner.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Track when employees were last seen (to handle idle threshold)
last_seen = {}  # mac_address -> datetime


def scan_network_arp():
    """
    Scan the local network using ARP to discover connected devices.
    Returns a set of MAC addresses found on the network.
    """
    detected_macs = set()
    system = platform.system()

    try:
        if system == "Linux":
            # Use arp-scan if available, fall back to arping/nmap
            try:
                result = subprocess.run(
                    ["arp-scan", "--localnet", "--quiet"],
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode == 0:
                    mac_pattern = re.compile(r'([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})')
                    for line in result.stdout.split('\n'):
                        match = mac_pattern.search(line)
                        if match:
                            detected_macs.add(match.group(1).lower())
                    return detected_macs
            except FileNotFoundError:
                pass

            # Fallback: use ping sweep + arp table
            subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]
            for i in range(1, 255):
                ip = f"{subnet_base}.{i}"
                subprocess.Popen(
                    ["ping", "-c", "1", "-W", "1", ip],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

            time.sleep(3)  # Wait for pings to complete

            # Read ARP table
            result = subprocess.run(
                ["arp", "-an"],
                capture_output=True, text=True, timeout=10
            )
            mac_pattern = re.compile(r'([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})')
            for line in result.stdout.split('\n'):
                match = mac_pattern.search(line)
                if match:
                    detected_macs.add(match.group(1).lower())

        elif system == "Windows":
            # Ping sweep
            subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]
            for i in range(1, 255):
                ip = f"{subnet_base}.{i}"
                subprocess.Popen(
                    ["ping", "-n", "1", "-w", "1000", ip],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

            time.sleep(5)

            # Read ARP table
            result = subprocess.run(
                ["arp", "-a"],
                capture_output=True, text=True, timeout=10
            )
            mac_pattern = re.compile(r'([0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2})')
            for line in result.stdout.split('\n'):
                match = mac_pattern.search(line)
                if match:
                    # Convert Windows format (xx-xx-xx-xx-xx-xx) to standard (xx:xx:xx:xx:xx:xx)
                    mac = match.group(1).replace('-', ':').lower()
                    detected_macs.add(mac)

        elif system == "Darwin":  # macOS
            # Ping sweep
            subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]
            for i in range(1, 255):
                ip = f"{subnet_base}.{i}"
                subprocess.Popen(
                    ["ping", "-c", "1", "-W", "1", ip],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

            time.sleep(3)

            # Read ARP table
            result = subprocess.run(
                ["arp", "-an"],
                capture_output=True, text=True, timeout=10
            )
            mac_pattern = re.compile(r'([0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2})')
            for line in result.stdout.split('\n'):
                match = mac_pattern.search(line)
                if match:
                    # Normalize MAC to two-digit hex
                    parts = match.group(1).split(':')
                    mac = ':'.join(p.zfill(2) for p in parts).lower()
                    detected_macs.add(mac)

    except Exception as e:
        logger.error(f"Error during network scan: {e}")

    return detected_macs


def process_scan_results(detected_macs):
    """
    Process the scan results: clock in/out employees based on detection.
    """
    global last_seen

    registered_macs = get_registered_macs()
    now = datetime.now()
    employees_detected = 0

    # Check which registered employees are currently on the network
    for mac, employee_id in registered_macs.items():
        if mac in detected_macs:
            # Employee is present
            employees_detected += 1
            last_seen[mac] = now

            # Try to clock them in (will skip if already clocked in)
            if clock_in(employee_id):
                logger.info(f"Employee {employee_id} (MAC: {mac}) clocked IN at {now.strftime('%H:%M:%S')}")
        else:
            # Employee not detected - check idle threshold
            if mac in last_seen:
                minutes_since_seen = (now - last_seen[mac]).total_seconds() / 60.0
                if minutes_since_seen >= IDLE_THRESHOLD:
                    # Employee has been gone long enough - clock them out
                    if clock_out(employee_id):
                        logger.info(f"Employee {employee_id} (MAC: {mac}) clocked OUT at {now.strftime('%H:%M:%S')} (idle for {minutes_since_seen:.0f} min)")
                    del last_seen[mac]

    # Log the scan
    log_scan(len(detected_macs), employees_detected)
    logger.info(f"Scan complete: {len(detected_macs)} devices found, {employees_detected} employees detected")

    return employees_detected


def run_scanner():
    """Main scanner loop."""
    logger.info("=" * 60)
    logger.info("Employee Tracking System - Network Scanner Started")
    logger.info(f"Scanning subnet: {NETWORK_SUBNET}")
    logger.info(f"Scan interval: {SCAN_INTERVAL} seconds")
    logger.info(f"Idle threshold: {IDLE_THRESHOLD} minutes")
    logger.info("=" * 60)

    # Initialize database
    init_db()

    while True:
        try:
            logger.info(f"Starting network scan at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            detected_macs = scan_network_arp()
            process_scan_results(detected_macs)
        except Exception as e:
            logger.error(f"Error in scan cycle: {e}")

        logger.info(f"Next scan in {SCAN_INTERVAL} seconds...")
        time.sleep(SCAN_INTERVAL)


if __name__ == "__main__":
    run_scanner()
