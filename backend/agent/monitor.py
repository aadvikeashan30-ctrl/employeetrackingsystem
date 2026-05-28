"""
Employee Activity Monitor Agent
Runs on each employee's laptop to track productivity.
Sends activity reports to the central server every 60 seconds.

Install: pip install pynput psutil Pillow requests
Run: python monitor.py --server http://192.168.31.240:5000 --mac aa:bb:cc:dd:ee:ff
"""

import time
import sys
import argparse
import threading
import json
import io
import base64
from datetime import datetime
from collections import defaultdict

try:
    from pynput import mouse, keyboard
    from pynput.keyboard import Key
except ImportError:
    print("ERROR: Install pynput: pip install pynput")
    sys.exit(1)

try:
    import psutil
except ImportError:
    print("ERROR: Install psutil: pip install psutil")
    sys.exit(1)

try:
    from PIL import ImageGrab
except ImportError:
    ImageGrab = None

try:
    import requests
except ImportError:
    print("ERROR: Install requests: pip install requests")
    sys.exit(1)

import platform
import subprocess


class ActivityMonitor:
    def __init__(self, server_url, mac_address):
        self.server_url = server_url.rstrip('/')
        self.mac_address = mac_address.lower()
        self.running = True
        
        # Counters (reset every report cycle)
        self.mouse_clicks = 0
        self.keystrokes = 0
        self.mouse_moves = 0
        self.last_activity_time = time.time()
        self.idle_seconds = 0
        self.active_app = ""
        self.active_title = ""
        self.apps_used = defaultdict(int)  # app_name -> seconds
        self.urls_visited = []
        
        # Lock for thread safety
        self._lock = threading.Lock()
        
    def start(self):
        """Start all monitoring threads."""
        print(f"[Agent] Starting activity monitor...")
        print(f"[Agent] Server: {self.server_url}")
        print(f"[Agent] MAC: {self.mac_address}")
        print(f"[Agent] Platform: {platform.system()}")
        print()
        
        # Start input listeners
        mouse_listener = mouse.Listener(
            on_click=self._on_click,
            on_move=self._on_move
        )
        mouse_listener.daemon = True
        mouse_listener.start()
        
        kb_listener = keyboard.Listener(on_press=self._on_key)
        kb_listener.daemon = True
        kb_listener.start()
        
        # Start active window tracker
        window_thread = threading.Thread(target=self._track_active_window, daemon=True)
        window_thread.start()
        
        # Start report sender
        report_thread = threading.Thread(target=self._report_loop, daemon=True)
        report_thread.start()
        
        # Start screenshot thread
        if ImageGrab:
            screenshot_thread = threading.Thread(target=self._screenshot_loop, daemon=True)
            screenshot_thread.start()
        
        print("[Agent] All monitors active. Press Ctrl+C to stop.")
        try:
            while self.running:
                time.sleep(1)
                # Update idle time
                with self._lock:
                    elapsed = time.time() - self.last_activity_time
                    if elapsed > 60:
                        self.idle_seconds += 1
        except KeyboardInterrupt:
            self.running = False
            print("\n[Agent] Stopped.")
    
    def _on_click(self, x, y, button, pressed):
        if pressed:
            with self._lock:
                self.mouse_clicks += 1
                self.last_activity_time = time.time()
    
    def _on_move(self, x, y):
        with self._lock:
            self.mouse_moves += 1
            self.last_activity_time = time.time()
    
    def _on_key(self, key):
        with self._lock:
            self.keystrokes += 1
            self.last_activity_time = time.time()
    
    def _get_active_window(self):
        """Get currently active window title and app name."""
        system = platform.system()
        try:
            if system == "Windows":
                import ctypes
                from ctypes import wintypes
                user32 = ctypes.windll.user32
                hwnd = user32.GetForegroundWindow()
                length = user32.GetWindowTextLengthW(hwnd)
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                title = buf.value
                
                # Get process name
                pid = wintypes.DWORD()
                user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                try:
                    proc = psutil.Process(pid.value)
                    app_name = proc.name()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    app_name = "Unknown"
                
                return app_name, title
                
            elif system == "Darwin":
                script = 'tell application "System Events" to get name of first application process whose frontmost is true'
                result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=2)
                app_name = result.stdout.strip() if result.returncode == 0 else "Unknown"
                return app_name, app_name
                
            elif system == "Linux":
                result = subprocess.run(["xdotool", "getactivewindow", "getwindowname"], capture_output=True, text=True, timeout=2)
                title = result.stdout.strip() if result.returncode == 0 else "Unknown"
                return title.split(" - ")[-1] if " - " in title else title, title
                
        except Exception:
            pass
        return "Unknown", "Unknown"
    
    def _extract_url_from_title(self, title):
        """Try to extract URL/domain from browser window title."""
        browsers = ['chrome', 'firefox', 'edge', 'safari', 'opera', 'brave']
        title_lower = title.lower()
        
        for browser in browsers:
            if browser in title_lower:
                # Browser titles usually format as: "Page Title - Browser Name"
                parts = title.rsplit(' - ', 1)
                if len(parts) >= 1:
                    return parts[0].strip()
        return None
    
    def _track_active_window(self):
        """Track active window every 2 seconds."""
        while self.running:
            app_name, title = self._get_active_window()
            with self._lock:
                self.active_app = app_name
                self.active_title = title
                self.apps_used[app_name] += 2
                
                # Check if browsing
                url_info = self._extract_url_from_title(title)
                if url_info and url_info not in [u['title'] for u in self.urls_visited[-10:]]:
                    self.urls_visited.append({
                        'title': url_info,
                        'app': app_name,
                        'time': datetime.now().strftime("%H:%M:%S")
                    })
            time.sleep(2)
    
    def _take_screenshot(self):
        """Take a screenshot and return as base64."""
        if not ImageGrab:
            return None
        try:
            img = ImageGrab.grab()
            img.thumbnail((800, 450))
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=50)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
        except Exception:
            return None
    
    def _screenshot_loop(self):
        """Take screenshots every 5 minutes."""
        while self.running:
            time.sleep(300)
            screenshot = self._take_screenshot()
            if screenshot:
                self._send_screenshot(screenshot)
    
    def _send_screenshot(self, screenshot_b64):
        """Send screenshot to server."""
        try:
            requests.post(
                f"{self.server_url}/api/activity/screenshot",
                json={
                    'mac_address': self.mac_address,
                    'screenshot': screenshot_b64,
                    'timestamp': datetime.now().isoformat()
                },
                timeout=10
            )
        except Exception:
            pass
    
    def _report_loop(self):
        """Send activity report every 60 seconds."""
        while self.running:
            time.sleep(60)
            self._send_report()
    
    def _send_report(self):
        """Compile and send activity report to server."""
        with self._lock:
            report = {
                'mac_address': self.mac_address,
                'timestamp': datetime.now().isoformat(),
                'mouse_clicks': self.mouse_clicks,
                'keystrokes': self.keystrokes,
                'mouse_moves': self.mouse_moves,
                'idle_seconds': self.idle_seconds,
                'active_app': self.active_app,
                'active_title': self.active_title,
                'apps_used': dict(self.apps_used),
                'urls_visited': self.urls_visited[-20:],
            }
            
            # Determine activity level
            total_input = self.mouse_clicks + self.keystrokes + self.mouse_moves
            if total_input > 100:
                report['activity_level'] = 'high'
            elif total_input > 20:
                report['activity_level'] = 'medium'
            elif total_input > 0:
                report['activity_level'] = 'low'
            else:
                report['activity_level'] = 'idle'
            
            # Reset counters
            self.mouse_clicks = 0
            self.keystrokes = 0
            self.mouse_moves = 0
            self.idle_seconds = 0
            self.apps_used.clear()
            self.urls_visited.clear()
        
        # Send to server
        try:
            resp = requests.post(
                f"{self.server_url}/api/activity/report",
                json=report,
                timeout=10
            )
            if resp.status_code == 200:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Report sent: {report['activity_level']} | clicks:{report['mouse_clicks']} keys:{report['keystrokes']} app:{report['active_app']}")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Report failed: {resp.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Server unreachable - will retry next cycle")
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {e}")


def main():
    parser = argparse.ArgumentParser(description='Employee Activity Monitor Agent')
    parser.add_argument('--server', required=True, help='Server URL (e.g. http://192.168.31.240:5000)')
    parser.add_argument('--mac', required=True, help='This device MAC address (e.g. a8:41:f4:8e:cf:13)')
    args = parser.parse_args()
    
    monitor = ActivityMonitor(args.server, args.mac)
    monitor.start()


if __name__ == '__main__':
    main()
