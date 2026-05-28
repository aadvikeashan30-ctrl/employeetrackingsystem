"""
Production Network Scanner for Employee Tracking System.

Scans the office Wi-Fi network using ARP to detect registered employee devices.
Implements a state machine for each employee:
  ABSENT -> DETECTED (clock in) -> ABSENT (clock out after idle threshold)

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
    get_registered_macs, clock_in, clock_out, log_scan, init_db
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
    """Tracks the connection state of each registered employee."""

    def __init__(self):
        self._lock = threading.Lock()
        # mac_address -> {"last_seen": datetime, "is_present": bool}
        self._states = {}

    def mark_seen(self, mac_address):
        """Mark an employee's device as seen on the network."""
        with self._lock:
            self._states[mac_address] = {
                "last_seen": datetime.now(),
                "is_present": True
            }

    def get_state(self, mac_address):
        """Get current state of an employee's device."""
        with self._lock:
            return self._states.get(mac_address)

    def mark_absent(self, mac_address):
        """Mark employee as absent (left office)."""
        with self._lock:
            if mac_address in self._states:
                self._states[mac_address]["is_present"] = False

    def is_idle(self, mac_address, threshold_minutes):
        """Check if employee has been unseen longer than threshold."""
        with self._lock:
            state = self._states.get(mac_address)
            if not state or not state["is_present"]:
                return False
            elapsed = (datetime.now() - state["last_seen"]).total_seconds() / 60.0
            return elapsed >= threshold_minutes

    def is_present(self, mac_address):
        """Check if employee is currently marked as present."""
        with self._lock:
            state = self._states.get(mac_address)
            return state["is_present"] if state else False


# Global state tracker
employee_states = EmployeeState()


def scan_network():
    """
    Perform ARP scan of the local network.
    Returns a set of MAC addresses currently connected to the network.
    Cross-platform: Windows, Linux, macOS.
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
    logger.debug(f"Scan completed in {scan_duration}ms, found {len(detected_macs)} devices")
    return detected_macs, scan_duration


def _scan_windows():
    """
    ARP scan for Windows.
    Uses multiple methods to maximize device detection:
    1. Ping sweep all IPs (populates ARP cache)
    2. Read ARP table
    3. Also try 'netsh' for neighbor discovery
    """
    detected = set()
    subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]

    # Step 1: Aggressive ping sweep to populate ARP table
    logger.debug(f"Ping sweep on {subnet_base}.1-254 ...")
    processes = []
    for i in range(1, 255):
        ip = f"{subnet_base}.{i}"
        p = subprocess.Popen(
            ["ping", "-n", "1", "-w", "1000", ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        processes.append(p)
        # Batch: wait after every 30 to avoid overwhelming
        if len(processes) >= 30:
            for proc in processes:
                proc.wait()
            processes = []
    for proc in processes:
        proc.wait()

    # Wait for ARP table to fully populate
    time.sleep(3)

    # Step 2: Read ARP table using 'arp -a'
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
            # Skip multicast (01-xx-xx)
            if line.strip().startswith('01-'):
                continue
            match = mac_pattern.search(line)
            if match:
                mac = match.group(1).replace('-', ':').lower()
                detected.add(mac)
    except Exception as e:
        logger.error(f"arp -a failed: {e}")

    # Step 3: Also try 'netsh' to get neighbor table (catches more devices)
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
        logger.debug(f"netsh neighbors failed: {e}")

    # Log all detected MACs for debugging
    logger.info(f"All MACs detected on network ({len(detected)}):")
    for mac in sorted(detected):
        logger.info(f"  -> {mac}")

    return detected


def _scan_linux():
    """ARP scan for Linux. Tries arp-scan first, falls back to ping + arp."""
    detected = set()

    # Try arp-scan (fastest and most reliable)
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
        logger.debug("arp-scan not available, falling back to ping + arp")

    # Fallback: ping sweep + arp table
    subnet_base = NETWORK_SUBNET.rsplit('.', 1)[0]
    processes = []
    for i in range(1, 255):
        ip = f"{subnet_base}.{i}"
        p = subprocess.Popen(
            ["ping", "-c", "1", "-W", "1", ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        processes.append(p)
        if len(processes) >= 50:
            for proc in processes:
                proc.wait()
            processes = []
    for proc in processes:
        proc.wait()

    time.sleep(2)

    result = subprocess.run(
        ["arp", "-an"],
        capture_output=True, text=True, timeout=10
    )
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
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        processes.append(p)
        if len(processes) >= 50:
            for proc in processes:
                proc.wait()
            processes = []
    for proc in processes:
        proc.wait()

    time.sleep(2)

    result = subprocess.run(
        ["arp", "-an"],
        capture_output=True, text=True, timeout=10
    )
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
    Core logic: Compare detected MACs against registered employees.
    Clock in newly detected, clock out those idle beyond threshold.
    """
    registered_macs = get_registered_macs()

    if not registered_macs:
        logger.warning("No employees registered. Add employees via the dashboard first.")
        log_scan(len(detected_macs), 0, scan_duration_ms)
        return 0

    # Log comparison for debugging
    logger.info(f"Registered MACs to look for:")
    for mac, emp_id in registered_macs.items():
        found = "FOUND" if mac in detected_macs else "NOT FOUND"
        logger.info(f"  Employee #{emp_id}: {mac} -> {found}")

    employees_detected = 0

    for mac, employee_id in registered_macs.items():
        if mac in detected_macs:
            # Device is on the network
            employees_detected += 1
            was_present = employee_states.is_present(mac)
            employee_states.mark_seen(mac)

            if not was_present:
                # New arrival - clock them in
                if clock_in(employee_id, auto_detected=True):
                    logger.info(f"CLOCK IN: Employee #{employee_id} (MAC: {mac}) detected on network")

        else:
            # Device NOT on the network
            if employee_states.is_idle(mac, IDLE_THRESHOLD_MINUTES):
                # Gone beyond threshold - clock out
                if clock_out(employee_id, auto_detected=True):
                    logger.info(
                        f"CLOCK OUT: Employee #{employee_id} (MAC: {mac}) "
                        f"absent for >{IDLE_THRESHOLD_MINUTES} minutes"
                    )
                employee_states.mark_absent(mac)

    # Log scan event
    log_scan(len(detected_macs), employees_detected, scan_duration_ms)

    logger.info(
        f"Scan result: {len(detected_macs)} devices on network, "
        f"{employees_detected}/{len(registered_macs)} employees detected"
    )
    return employees_detected


def run_scanner():
    """Main scanner loop. Runs continuously until stopped."""
    logger.info("=" * 60)
    logger.info("PRODUCTION SCANNER STARTED")
    logger.info(f"  Platform:       {platform.system()} {platform.release()}")
    logger.info(f"  Subnet:         {NETWORK_SUBNET}")
    logger.info(f"  Scan interval:  {SCAN_INTERVAL_SECONDS}s ({SCAN_INTERVAL_SECONDS // 60} min)")
    logger.info(f"  Idle threshold: {IDLE_THRESHOLD_MINUTES} min")
    logger.info("=" * 60)

    # Initialize database on start
    init_db()

    # Check if any employees are registered
    registered = get_registered_macs()
    if not registered:
        logger.warning("")
        logger.warning("  NO EMPLOYEES REGISTERED!")
        logger.warning("  Add employees via the web dashboard first.")
        logger.warning("  The scanner will keep running and check again each cycle.")
        logger.warning("")

    scan_count = 0
    consecutive_errors = 0

    while True:
        try:
            scan_count += 1
            logger.info(f"--- Scan #{scan_count} at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---")

            detected_macs, scan_duration = scan_network()
            process_scan_results(detected_macs, scan_duration)

            consecutive_errors = 0  # Reset on success

        except Exception as e:
            consecutive_errors += 1
            logger.error(f"Scan #{scan_count} FAILED (error #{consecutive_errors}): {e}", exc_info=True)

            # Back off if repeated failures
            if consecutive_errors >= 5:
                backoff = min(consecutive_errors * 30, 300)
                logger.warning(f"Multiple failures. Backing off for {backoff}s before retry...")
                time.sleep(backoff)

        # Wait for next scan cycle
        logger.debug(f"Sleeping {SCAN_INTERVAL_SECONDS}s until next scan...")
        time.sleep(SCAN_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_scanner()
