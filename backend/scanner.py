"""
Production Network Scanner for Employee Tracking System.

Scans the office Wi-Fi network using ARP to detect registered employee devices.
Clock-in: When device is detected on network
Clock-out: When device is NOT detected for 2 consecutive scans (immediate)

Supports: Windows, Linux, macOS
Requires: Administrator/root privileges for ARP scanning
"""

import time
import subprocess
import re
import platform
import logging
import threading
from datetime import datetime
from config import SCAN_INTERVAL_SECONDS, IDLE_THRESHOLD_MINUTES, NETWORK_SUBNET, LOG_FILE, LOG_LEVEL
from database import (
    get_registered_macs, clock_in, clock_out, log_scan, init_db,
    get_currently_present
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
logger = logging.getLogger("scanner")


class EmployeeState:
    """
    Tracks consecutive missed scans for each employee.
    If an employee is missed for IDLE_THRESHOLD consecutive scans, clock them out.
    """

    def __init__(self):
        self._lock = threading.Lock()
        # mac_address -> {"missed_scans": int, "last_seen": datetime}
        self._states = {}

    def mark_seen(self, mac_address):
        """Employee detected - reset missed counter."""
        with self._lock:
            self._states[mac_address] = {
                "missed_scans": 0,
                "last_seen": datetime.now()
            }

    def mark_missed(self, mac_address):
        """Employee NOT detected in this scan - increment counter."""
        with self._lock:
            if mac_address not in self._states:
                self._states[mac_address] = {
                    "missed_scans": 1,
                    "last_seen": None
                }
            else:
                self._states[mac_address]["missed_scans"] += 1
            return self._states[mac_address]["missed_scans"]

    def get_missed_count(self, mac_address):
        """How many consecutive scans has this MAC been missed."""
        with self._lock:
            state = self._states.get(mac_address)
            return state["missed_scans"] if state else 0

    def reset(self, mac_address):
        """Reset state for a MAC."""
        with self._lock:
            if mac_address in self._states:
                del self._states[mac_address]


# Global state tracker
employee_states = EmployeeState()

# How many consecutive missed scans before clock-out
# With 5 min scan interval, 2 missed = 10 min, 3 missed = 15 min
MISSED_SCANS_BEFORE_CLOCKOUT = max(1, IDLE_THRESHOLD_MINUTES // (SCAN_INTERVAL_SECONDS // 60))


def scan_network():
    """
    Perform ARP scan of the local network.
    Returns a set of MAC addresses currently connected to the network.
    """
    detected_macs = set()
    system = platform.system()
    start_time = time.time()

    try:
        if system == "Windows":
            detected_macs = _scan_windows()
        elif system == "Linux":
            detected_macs = _scan_linux()
        elif system == "Darwin":
            detected_macs = _scan_macos()
        else:
            logger.error(f"Unsupported platform: {system}")

    except Exception as e:
        logger.error(f"Network scan failed: {e}", exc_info=True)

    scan_duration = int((time.time() - start_time) * 1000)
    return detected_macs, scan_duration


def _scan_windows():
    """
    ARP scan for Windows.
    1. Ping sweep all IPs to populate ARP cache
    2. Read ARP table (arp -a)
    3. Read netsh neighbor table
    """
    detected = set()
    subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]

    # Step 1: Ping sweep
    logger.debug(f"Ping sweep {subnet_base}.1-254 ...")
    processes = []
    for i in range(1, 255):
        ip = f"{subnet_base}.{i}"
        p = subprocess.Popen(
            ["ping", "-n", "1", "-w", "1000", ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        processes.append(p)
        if len(processes) >= 30:
            for proc in processes:
                proc.wait()
            processes = []
    for proc in processes:
        proc.wait()

    time.sleep(3)

    # Step 2: Read ARP table
    try:
        result = subprocess.run(
            ["arp", "-a"],
            capture_output=True, text=True, timeout=10
        )
        mac_pattern = re.compile(
            r'([0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2})'
        )
        for line in result.stdout.split('\n'):
            if 'ff-ff-ff-ff-ff-ff' in line.lower():
                continue
            match = mac_pattern.search(line)
            if match:
                mac = match.group(1).replace('-', ':').lower()
                detected.add(mac)
    except Exception as e:
        logger.error(f"arp -a failed: {e}")

    # Step 3: netsh neighbor table
    try:
        result = subprocess.run(
            ["netsh", "interface", "ipv4", "show", "neighbors"],
            capture_output=True, text=True, timeout=10
        )
        mac_pattern = re.compile(
            r'([0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2})'
        )
        for line in result.stdout.split('\n'):
            if 'ff-ff-ff-ff-ff-ff' in line.lower():
                continue
            match = mac_pattern.search(line)
            if match:
                mac = match.group(1).replace('-', ':').lower()
                detected.add(mac)
    except Exception as e:
        logger.debug(f"netsh failed: {e}")

    # Log detected MACs
    logger.info(f"Detected {len(detected)} devices on network:")
    for mac in sorted(detected):
        logger.debug(f"  -> {mac}")

    return detected


def _scan_linux():
    """ARP scan for Linux."""
    detected = set()

    try:
        result = subprocess.run(
            ["arp-scan", "--localnet", "--quiet", "--retry=2"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            mac_pattern = re.compile(
                r'([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})'
            )
            for line in result.stdout.split('\n'):
                match = mac_pattern.search(line)
                if match:
                    detected.add(match.group(1).lower())
            return detected
    except FileNotFoundError:
        pass

    subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]
    processes = []
    for i in range(1, 255):
        ip = f"{subnet_base}.{i}"
        p = subprocess.Popen(
            ["ping", "-c", "1", "-W", "1", ip],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        processes.append(p)
        if len(processes) >= 50:
            for proc in processes:
                proc.wait()
            processes = []
    for proc in processes:
        proc.wait()

    time.sleep(2)

    result = subprocess.run(["arp", "-an"], capture_output=True, text=True, timeout=10)
    mac_pattern = re.compile(
        r'([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})'
    )
    for line in result.stdout.split('\n'):
        if 'ff:ff:ff:ff:ff:ff' in line.lower():
            continue
        match = mac_pattern.search(line)
        if match:
            detected.add(match.group(1).lower())

    return detected


def _scan_macos():
    """ARP scan for macOS."""
    detected = set()
    subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]
    processes = []
    for i in range(1, 255):
        ip = f"{subnet_base}.{i}"
        p = subprocess.Popen(
            ["ping", "-c", "1", "-W", "1", ip],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        processes.append(p)
        if len(processes) >= 50:
            for proc in processes:
                proc.wait()
            processes = []
    for proc in processes:
        proc.wait()

    time.sleep(2)

    result = subprocess.run(["arp", "-an"], capture_output=True, text=True, timeout=10)
    mac_pattern = re.compile(
        r'([0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2})'
    )
    for line in result.stdout.split('\n'):
        if 'ff:ff:ff:ff:ff:ff' in line.lower():
            continue
        match = mac_pattern.search(line)
        if match:
            parts = match.group(1).split(':')
            mac = ':'.join(p.zfill(2) for p in parts).lower()
            detected.add(mac)

    return detected


def process_scan_results(detected_macs, scan_duration_ms):
    """
    Core logic:
    - If employee MAC is FOUND -> clock them in (if not already)
    - If employee MAC is NOT FOUND -> after N consecutive misses, clock them out
    - On scanner startup, immediately clock out anyone in DB who is not detected
    """
    registered_macs = get_registered_macs()

    if not registered_macs:
        logger.warning("No employees registered.")
        log_scan(len(detected_macs), 0, scan_duration_ms)
        return 0

    employees_detected = 0

    for mac, employee_id in registered_macs.items():
        if mac in detected_macs:
            # FOUND on network
            employees_detected += 1
            employee_states.mark_seen(mac)

            # Clock in if not already
            if clock_in(employee_id, auto_detected=True):
                logger.info(f"CLOCK IN: Employee #{employee_id} (MAC: {mac})")

        else:
            # NOT FOUND on network
            missed = employee_states.mark_missed(mac)
            logger.debug(f"Employee #{employee_id} ({mac}): missed {missed}/{MISSED_SCANS_BEFORE_CLOCKOUT}")

            if missed >= MISSED_SCANS_BEFORE_CLOCKOUT:
                # Enough consecutive misses - clock them out
                if clock_out(employee_id, auto_detected=True):
                    logger.info(
                        f"CLOCK OUT: Employee #{employee_id} (MAC: {mac}) "
                        f"- not detected for {missed} consecutive scans"
                    )
                employee_states.reset(mac)

    # Log scan
    log_scan(len(detected_macs), employees_detected, scan_duration_ms)

    logger.info(
        f"Scan complete: {len(detected_macs)} devices, "
        f"{employees_detected}/{len(registered_macs)} employees detected"
    )
    return employees_detected


def clockout_stale_sessions():
    """
    On scanner startup: clock out anyone who is still marked as 'present'
    in the database but is NOT currently on the network.
    Fixes the bug where employees stay 'In Office' after scanner restarts.
    """
    present_employees = get_currently_present()
    if not present_employees:
        return

    logger.info(f"Checking {len(present_employees)} employees marked as present in database...")

    detected_macs, _ = scan_network()

    for emp in present_employees:
        mac = emp.get('mac_address', '').lower()
        if mac and mac not in detected_macs:
            clock_out(emp['id'], auto_detected=True)
            logger.info(
                f"STARTUP CLOCK OUT: {emp['name']} (#{emp['id']}, MAC: {mac}) "
                f"- was marked present but not on network"
            )


def run_scanner():
    """Main scanner loop."""
    logger.info("=" * 60)
    logger.info("PRODUCTION SCANNER STARTED")
    logger.info(f"  Platform:       {platform.system()} {platform.release()}")
    logger.info(f"  Subnet:         {NETWORK_SUBNET}")
    logger.info(f"  Scan interval:  {SCAN_INTERVAL_SECONDS}s ({SCAN_INTERVAL_SECONDS // 60} min)")
    logger.info(f"  Idle threshold: {IDLE_THRESHOLD_MINUTES} min ({MISSED_SCANS_BEFORE_CLOCKOUT} missed scans)")
    logger.info("=" * 60)

    # Initialize database
    init_db()

    # CRITICAL: Clock out stale sessions from previous scanner run
    logger.info("Cleaning stale sessions from previous run...")
    clockout_stale_sessions()

    scan_count = 0
    consecutive_errors = 0

    while True:
        try:
            scan_count += 1
            logger.info(f"--- Scan #{scan_count} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---")

            detected_macs, scan_duration = scan_network()
            process_scan_results(detected_macs, scan_duration)

            consecutive_errors = 0

        except Exception as e:
            consecutive_errors += 1
            logger.error(f"Scan #{scan_count} FAILED: {e}", exc_info=True)

            if consecutive_errors >= 5:
                backoff = min(consecutive_errors * 30, 300)
                logger.warning(f"Backing off {backoff}s...")
                time.sleep(backoff)

        time.sleep(SCAN_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_scanner()
