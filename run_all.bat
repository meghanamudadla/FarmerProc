@echo off
title FarmerProc — Unified Platform Launcher
color 0A

set "ROOT=%~dp0"

echo =====================================================================
echo               🌾 FARMERPROC — ALL SERVICES LAUNCHER 🌾
echo =====================================================================
echo.
echo Starting all microservices in separate console windows...
echo.

:: 1. Backend FastAPI Service (Port 8000)
echo [1/5] Starting Backend FastAPI Server (Port 8000)...
start "FarmerProc [1] Backend API (8000)" cmd /k "cd /d ""%ROOT%backend"" && venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: 2. Farmer Portal (Port 5173)
echo [2/5] Starting Farmer Web Portal (Port 5173)...
start "FarmerProc [2] Farmer Portal (5173)" cmd /k "cd /d ""%ROOT%farmersfolder"" && npm run dev"

:: 3. Mandi Center Console (Port 5174)
echo [3/5] Starting Mandi Center Console (Port 5174)...
start "FarmerProc [3] Center Console (5174)" cmd /k "cd /d ""%ROOT%center-app"" && npm run dev"

:: 4. Government Command Center (Port 5175)
echo [4/5] Starting Government Command Center (Port 5175)...
start "FarmerProc [4] Govt Command (5175)" cmd /k "cd /d ""%ROOT%government"" && npm run dev"

:: 5. Telephony IVR Service (Port 3000)
echo [5/5] Starting Telephony & Voice IVR Subsystem (Port 3000)...
start "FarmerProc [5] Telephony IVR (3000)" cmd /k "cd /d ""%ROOT%unknownpeoples"" && node server.js"

:: 6. Launch Access Gateway in Default Browser
timeout /t 3 /nobreak >nul
echo.
echo [COMPLETE] Opening FarmerProc Access Gateway in your browser...
start "" "%ROOT%gateway\index.html"

echo.
echo =====================================================================
echo  All services are launching! You can monitor each window independently.
echo.
echo  • Gateway Hub:        file:///%ROOT%gateway/index.html
echo  • Farmer Portal:      http://localhost:5173
echo  • Mandi Console:      http://localhost:5174
echo  • Govt Dashboard:     http://localhost:5175
echo  • Telephony IVR:      http://localhost:3000
echo  • Backend API Docs:   http://localhost:8000/docs
echo =====================================================================
pause
