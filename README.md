# FarmerProc — Agricultural Procurement Platform

FarmerProc is a comprehensive, multi-portal agricultural procurement management platform designed to streamline harvest booking, queue coordination, quality testing, payment tracking, and state-level procurement monitoring.

---

## 🏛 System Architecture

The platform consists of four core modules:

1. **`farmersfolder/` (Farmer Portal — React + Vite)**
   - **Farmer Registration & Profiles**: Land area and crop eligibility calculation.
   - **Slot Booking Engine**: Time-slot reservation with gate pass issuance and QR codes.
   - **Live Queue Tracker**: Real-time queue status updates (WebSocket / local event engine).
   - **Multi-Channel Notification Hub**: In-app notifications, mobile push alerts, IVR voice note simulation, and **simulated SMS notifications** (demo mode).
   - **Grievance Redressal & Crop Management**: File issues and manage registered crops.

2. **`center-app/` (Mandi Center Console — React + Vite)**
   - **Gate Check-in**: QR scanner for token verification and queue placement.
   - **Weighbridge & Processing Hub**: Record gross/tare weights and calculate net quintals.
   - **Rule-Based Quality Check**: Parameter inspection (moisture %, foreign matter, damaged grains) with deterministic rule-based grading.
   - **MSP Payout & Disbursement**: Automated MSP calculations and bank transfer status.

3. **`government/` (State Government Command Center — React + Vite)**
   - **Procurement Dashboard**: State-wide procurement metrics, active center tracking, and daily arrival KPIs.
   - **Congestion & Arrival Trends**: Historical trend baselines and arrival distribution patterns to guide center staffing and volume redirection.
   - **Alert System**: Notifications for queue congestion, high rejection rates, and center downtime.
   - **Audit Logs & Dispute Resolution**: Transparent tracking of administrative actions and grievance handling.

4. **`backend/` (FastAPI REST & WebSocket Backend)**
   - Role-based authentication, booking engine APIs, real-time WebSocket queue manager, and SQLite/SQLAlchemy data persistence.

---

## ⚙️ Key Feature Highlights (Honest Scope)

- **Rule-Based Quality Assessment**: Transparent, threshold-based quality check system against standardized MSP grading limits (no machine learning or artificial intelligence models).
- **Simulated SMS Service**: Demo SMS service adapter simulating carrier delivery callbacks and retry flows for development testing.
- **Real-Time Queue Management**: Instant token updates and queue tracking powered by WebSockets.
- **Unified Product Naming**: Standardized `FarmerProc` product identity across all frontends, backend, and documentation.

---

## 🚀 Running Locally

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Applications Setup
Each frontend can be run independently using Vite:

```bash
# Farmer Portal
cd farmersfolder
npm install
npm run dev

# Center Console
cd center-app
npm install
npm run dev

# Government Command Center
cd government
npm install
npm run dev
```

---

## 📄 License
Internal / Government Procurement Demonstration Project.
