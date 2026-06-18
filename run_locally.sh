#!/bin/bash
echo "==================================================="
echo "  MediQR Local Dev Server Setup & Runner"
echo "==================================================="
echo

# 1. Check node
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js (v18+) from https://nodejs.org"
    echo
    exit 1
fi
echo "Node.js is installed."
echo

# 2. Install
echo "[2/3] Installing dependencies (npm install)..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies."
    exit 1
fi
echo

# 3. Run
echo "[3/3] Launching local servers (npm run start:all)..."
echo
echo "==================================================="
echo "  Frontend Dashboard: http://localhost:5173"
echo "  Backend Express API: http://localhost:5000"
echo "==================================================="
echo
npm run start:all
