# FarmerProc — Unified PowerShell Multi-Service Launcher
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "              🌾 FARMERPROC — ALL SERVICES LAUNCHER 🌾" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

$RootPath = $PSScriptRoot

# 1. Backend FastAPI Service (Port 8000)
Write-Host "[1/5] Starting Backend FastAPI Server (Port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\backend'; if (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 } elseif (Test-Path '..\.venv\Scripts\Activate.ps1') { ..\.venv\Scripts\Activate.ps1 }; uvicorn main:app --reload --port 8000"

Start-Sleep -Seconds 3

# 2. Farmer Portal (Port 5173)
Write-Host "[2/5] Starting Farmer Web Portal (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\farmersfolder'; npm run dev"

# 3. Mandi Center Console (Port 5174)
Write-Host "[3/5] Starting Mandi Center Console (Port 5174)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\center-app'; npm run dev"

# 4. Government Command Center (Port 5175)
Write-Host "[4/5] Starting Government Command Center (Port 5175)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\government'; npm run dev"

# 5. Telephony IVR Subsystem (Port 3000)
Write-Host "[5/5] Starting Telephony & Voice IVR Subsystem (Port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\unknownpeoples'; node server.js"

Start-Sleep -Seconds 2

# 6. Open Gateway
Write-Host "`n[COMPLETE] Opening Access Gateway..." -ForegroundColor Green
Start-Process "$RootPath\gateway\index.html"

Write-Host "`nAll services have been started in separate terminal windows." -ForegroundColor Yellow
Write-Host "• Gateway Hub:        $RootPath\gateway\index.html"
Write-Host "• Farmer Portal:      http://localhost:5173"
Write-Host "• Mandi Console:      http://localhost:5174"
Write-Host "• Govt Dashboard:     http://localhost:5175"
Write-Host "• Telephony IVR:      http://localhost:3000"
Write-Host "• Backend API Docs:   http://localhost:8000/docs"
