# FarmerProc — Agricultural Procurement & Mandi Management Platform

`FarmerProc` is an end-to-end, rule-based agricultural procurement and queue management system designed for state governments, procurement centers (mandis), and farmers. It streamlines harvest intake, token allocation, queue processing, quality control, and payment tracking with full transparency.

> [!NOTE]
> **Scope & Technology Clarification**: `FarmerProc` uses deterministic rule-based algorithms, WebSocket real-time queues, and structured workflows. **No machine learning (ML) models or AI features are used in this application.**

---

## 🏛 System Architecture & Scope

The platform consists of four primary modules:

### 1. Farmer Portal (`farmersfolder/`)
- **Farmer Profile & Registration**: Land holding verification and crop registration.
- **Rule-Based Slot Booking**: Schedule procurement center visits within eligible quota limits and operating hours.
- **Real-Time Queue Tracking**: Monitor live token status and estimated waiting time.
- **Multi-Channel Notifications**: In-app notifications with simulated SMS and IVR voice call previews for demo purposes.
- **Procurement & Payout Receipts**: Digital gate passes, quality inspection certificates, and bank payment tracking.

### 2. Procurement Center Console (`center-app/`)
- **Live Queue Management**: Real-time token caller, stage progression, and status updates (WebSocket-integrated).
- **Weighbridge Intake**: Gross, tare, and net weight calculations.
- **Rule-Based Quality Inspection**: Automated evaluation against crop parameters (moisture %, foreign matter %, damaged grains) with pass/fail grading.
- **Disbursement Processing**: MSP payout calculation and transaction UTR logging.

### 3. Government Operations Portal (`government/`)
- **State-Wide Command Dashboard**: District and center procurement monitoring, active queue lengths, and throughput analytics.
- **Congestion & Arrival Trends**: Historical harvest pattern and arrival volume trend visualization.
- **Grievance Redressal & Alert System**: Issue tracking, center operational status monitoring, and audit logging.

### 4. Backend Service (`backend/`)
- **FastAPI Framework**: Modular REST APIs for authentication, farmers, centers, slots, bookings, procurement, and payments.
- **WebSocket Gateway**: Real-time queue and notification event broadcasting.
- **Database Model**: SQLite storage managed via SQLAlchemy ORM.

---

## 🚀 Running the Services Locally

### Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Farmer Portal Setup (React + Vite)
```bash
cd farmersfolder
npm install
npm run dev
```

### Procurement Center Console Setup (React + Vite)
```bash
cd center-app
npm install
npm run dev
```

### Government Operations Portal Setup (React + Vite)
```bash
cd government
npm install
npm run dev
```

---

## 📋 Summary of Capabilities
- **Farmer Registration**: Quota and crop eligibility checks based on land area.
- **Slot Booking**: Rule-based validation with double-booking prevention and mutex slot locking.
- **Real-Time Queue**: Live status synchronization via WebSockets.
- **Notifications**: In-app delivery with simulated SMS and voice call notifications for demo environments.
- **Procurement & Payment**: Automated MSP calculation, weight breakdown, and UTR tracking.
- **Rule-Based Quality Checks**: Parameter-based thresholds (no AI/ML claims).
