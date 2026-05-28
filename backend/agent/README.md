# Employee Activity Monitor Agent

Install on each employee's laptop to track activity when connected to office Wi-Fi.

## Install

```bash
pip install -r requirements.txt
```

## Run

```bash
python monitor.py --server http://YOUR_SERVER_IP:5000 --mac YOUR_MAC_ADDRESS
```

Example:
```bash
python monitor.py --server http://192.168.31.240:5000 --mac a8:41:f4:8e:cf:13
```

## What it tracks
- Mouse clicks & movement per minute
- Keyboard keystrokes per minute
- Currently active application
- Browser tab titles (URL/page names)
- Idle time (no input for 60+ seconds)
- Screenshots every 5 minutes (low quality, compressed)
- Activity level classification (high/medium/low/idle)

## Privacy
- Only active when on office Wi-Fi
- Only tracks application names, not file contents
- Screenshots are low-res and auto-deleted after 24 hours
- Employees should be informed about monitoring
