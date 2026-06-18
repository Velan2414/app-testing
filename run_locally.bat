@echo off
echo ===================================================
echo   MediQR Local Dev Server Setup & Runner
echo ===================================================
echo.
echo [1/3] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js (v18+) from https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo Node.js is installed.
echo.
echo [2/3] Installing dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    echo.
    pause
    exit /b 1
)
echo.
echo [3/3] Launching local servers (npm run start:all)...
echo.
echo ===================================================
echo   Frontend Dashboard: http://localhost:5173
echo   Backend Express API: http://localhost:5000
echo ===================================================
echo.
call npm run start:all
pause
