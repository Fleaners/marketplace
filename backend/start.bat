@echo off
REM Start script for DealerConnect backend

echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting backend server...
npm start
