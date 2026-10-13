"""
Retail Inventory and Sales Management System
Academic DBMS Capstone Project Launcher

Allows running the entire project with a single command:
    python app.py
"""

import os
import sys
import time
import socket
import webbrowser
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(BASE_DIR, "server")
CLIENT_DIR = os.path.join(BASE_DIR, "client")

BANNER = r"""
========================================================================
   RETAIL INVENTORY AND SALES MANAGEMENT SYSTEM
   DBMS Project Based Learning (PBL) Capstone Project
========================================================================
"""

def is_port_in_use(port, host="127.0.0.1"):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex((host, port)) == 0

def find_node():
    for candidate in ["node", "node.exe"]:
        try:
            subprocess.run([candidate, "--version"], capture_output=True, text=True, check=True)
            return candidate
        except Exception:
            pass
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
    paths = [
        os.path.join(local_app_data, "Programs", "nodejs", "node.exe"),
        os.path.join(program_files, "nodejs", "node.exe"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

def find_npm():
    for candidate in ["npm", "npm.cmd"]:
        try:
            subprocess.run([candidate, "--version"], capture_output=True, text=True, check=True, shell=True)
            return candidate
        except Exception:
            pass
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
    paths = [
        os.path.join(local_app_data, "Programs", "nodejs", "npm.cmd"),
        os.path.join(program_files, "nodejs", "npm.cmd"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return "npm"

def main():
    print(BANNER)
    node_exe = find_node()
    npm_cmd = find_npm()

    if not node_exe:
        print("[ERROR] Node.js is required to run this full-stack application.")
        print("Please install Node.js from https://nodejs.org or check your PATH.")
        sys.exit(1)

    print(f"[OK] Node runtime detected: {node_exe}")

    backend_running = is_port_in_use(5000)
    frontend_running = is_port_in_use(5173)

    processes = []

    # Start backend if not already listening
    if backend_running:
        print("[INFO] Backend API is already running on http://localhost:5000")
    else:
        print("[INFO] Launching backend server on port 5000...")
        p_server = subprocess.Popen(
            [node_exe, "src/server.js"],
            cwd=SERVER_DIR,
            shell=True
        )
        processes.append(p_server)

    # Start frontend if not already listening
    if frontend_running:
        print("[INFO] Frontend React application is already running on http://localhost:5173")
    else:
        print("[INFO] Launching frontend Vite application on port 5173...")
        p_client = subprocess.Popen(
            [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
            cwd=CLIENT_DIR,
            shell=True
        )
        processes.append(p_client)

    # Wait for services to become ready
    print("\nWaiting for services to initialize...")
    for _ in range(15):
        if is_port_in_use(5000) and is_port_in_use(5173):
            break
        time.sleep(1)

    print("\n" + "=" * 72)
    print("  SYSTEM IS READY AND RUNNING!")
    print("=" * 72)
    print("  * Frontend Portal: http://localhost:5173")
    print("  * Backend API:     http://localhost:5000/api")
    print("  * Database:        MySQL (retail_management on port 3306)")
    print("\n  Default Demo Login Credentials:")
    print("  - Administrator: Username: admin    | Password: password123")
    print("  - Cashier:       Username: cashier1 | Password: password123")
    print("  - Manager:       Username: manager1 | Password: password123")
    print("=" * 72)

    # Open browser automatically
    print("\nOpening web browser at http://localhost:5173 ...")
    try:
        webbrowser.open("http://localhost:5173")
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

    if not processes:
        print("\nAll background services are currently active.")
        print("You can access the system at http://localhost:5173.")
        return

    print("\n[Press Ctrl+C to stop servers and exit]")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        for p in processes:
            try:
                p.terminate()
            except Exception:
                pass
        print("Shutdown complete. Goodbye!")

if __name__ == "__main__":
    main()
