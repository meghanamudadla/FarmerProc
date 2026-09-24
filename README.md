# FarmerProc — Smart and Inclusive Agricultural Procurement Platform

**FarmerProc** is an enterprise-grade, multi-portal agricultural procurement platform designed to streamline harvest booking, queue coordination, weighbridge intake, quality testing, payment tracking, grievance redressal, and state-level procurement monitoring.

---

## 🏛 System Architecture & Overview

The platform connects three specialized React client portals and a telephony IVR service to a unified FastAPI backend backed by PostgreSQL.

```mermaid
graph TD
    subgraph Client Applications
        FP[Farmer Portal - React :5173]
        CP[Center Console - React :5174]
        GP[Government Command Center - React :5175]
        IVR[Telephony IVR Service - Node :3000]
    end

    subgraph Backend Services
        API[FastAPI Backend :8000]
        AUTH[JWT & DB-Backed OTP Engine]
        DQA[Canonical DQA & Simulation Engine]
        WS[WebSocket Live Queue Manager]
        LOG[Structured Request & Audit Logger]
        WF[Procurement Workflow State Machine]
    end

    subgraph Data & Storage Layer
        PG[(PostgreSQL Database)]
        IDB[(Client IndexedDB - Offline Sync)]
    end

    FP -->|HTTPS / REST| API
    CP -->|HTTPS / REST| API
    GP -->|HTTPS / REST| API
    IVR -->|Webhook / REST| API
    
    FP <-->|WSS Queue Updates| WS
    CP <-->|WSS Live Intake| WS
    
    FP <-->|Background Sync| IDB
    
    API --> AUTH
    API --> DQA
    API --> WF
    API --> WS
    API --> LOG
    
    AUTH --> PG
    WF --> PG
    DQA --> PG
    LOG --> PG
```

---

## 💻 Technology Stack

| Layer | Technologies |
|---|---|
| **Farmer Portal** | React 18, Vite, Lucide Icons, Canvas QR, IndexedDB (`KisanSevaDB`), Responsive CSS |
| **Center Console** | React 18, Vite, TailwindCSS, HTML5 QR/Barcode Scanner, WebSockets |
| **Government Dashboard** | React 18, Vite, Lucide Icons, Recharts, Responsive Grid |
| **Telephony / IVR** | Node.js, Express, Twilio / Exotel Voice Simulation |
| **API Backend** | Python 3.14 / 3.11+, FastAPI, Pydantic V2, Starlette |
| **Database & ORM** | PostgreSQL (Aiven Cloud / Dedicated), SQLAlchemy 2.0, Psycopg2 |
| **Security & Auth** | Python-Jose (JWT), Passlib (Bcrypt), SHA-256 OTP Hashing, RBAC |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX, Starlette TestClient (109 passing tests) |

---

## 📁 Folder Structure

```
FarmerProc/
├── backend/                         # FastAPI Backend
│   ├── app/                         # Modular package entry
│   ├── auth/                        # Strict JWT & DB-backed OTP sessions
│   │   ├── dependencies.py          # get_current_user, require_role (401/403)
│   │   └── routes.py                # Rate-limited OTP and Auth endpoints
│   ├── bookings/                    # Atomic booking & slot reservation
│   ├── procurement/                 # State machine & procurement routes
│   │   ├── workflow.py              # BookingStatus state machine validator
│   │   └── routes.py                # Procurement lifecycle API
│   ├── weighing/                    # Strict weighbridge validation
│   ├── quality/                     # Configurable crop quality engine
│   │   ├── rules.py                 # Crop standards (Paddy, Wheat, Cotton, Maize)
│   │   ├── schemas.py               # Inspection request/response schemas
│   │   ├── service.py               # Evaluation engine & deduction logic
│   │   └── routes.py                # Quality endpoints
│   ├── payments/                    # Idempotent payments & retry lifecycle
│   ├── task_queue/                  # WebSocket queue manager with ping/pong
│   ├── dqa/                         # Canonical Dynamic Queue Assignment module
│   │   ├── engine.py                # Core DQA scoring engine
│   │   ├── capacity.py              # Center capacity & slot allocation
│   │   ├── congestion.py            # Real-time congestion index
│   │   ├── eta.py                   # Waiting time estimation
│   │   ├── fairness.py              # Marginal farmer prioritization
│   │   ├── priority.py              # Dynamic priority queueing
│   │   ├── simulation.py            # Mandi arrival simulation
│   │   └── tests/                   # 87 automated DQA unit tests
│   ├── analytics/                   # Real-time state aggregation endpoints
│   ├── config.py                    # Centralized environment configuration
│   ├── database.py                  # PostgreSQL SQLAlchemy connection engine
│   ├── models.py                    # Database schema with constraints & indexes
│   ├── main.py                      # FastAPI application with CORS & logging
│   └── test_comprehensive_workflow.py # End-to-end Phase 23 test suite
├── center-app/                      # Mandi Center Console (Vite + React)
│   ├── src/services/liveQueueSocket.js # Heartbeat WebSocket client
│   └── src/context/QueueContext.jsx # Live queue state synchronizer
├── farmersfolder/                   # Farmer Portal (Vite + React)
│   └── src/services/offlineSyncService.js # IndexedDB offline synchronization
├── government/                      # Government Command Center (Vite + React)
│   └── src/api/api.js               # Connected to live backend analytics
└── telephony/                       # Node.js IVR Telephony Gateway
```

---

## 🔒 Authentication & Role-Based Security

### Authentication Principles
1. **No Auto-Login Kiosk Fallback**: Missing credentials or unauthenticated requests immediately return `401 Unauthorized` with structured error details.
2. **Role-Based Access Control (RBAC)**:
   - `FARMER`: Manages own profile, crops, bookings, grievances, and notifications.
   - `CENTER_OPERATOR`: Operates gate check-in, weighbridge intake, quality checks, procurement, and payment initiation.
   - `ADMIN` / `GOVERNMENT`: Accesses analytics dashboards, system alerts, audit logs, and center management.
3. **Database-Backed OTP Engine**:
   - Stored in PostgreSQL (`otp_sessions` and `verified_phone_sessions`).
   - SHA-256 HMAC-style salted hashing: OTP codes are never logged or stored in plaintext.
   - Rate limiting: Maximum 5 OTP requests per hour per phone.
   - Attempt throttling: Locked out after 3 incorrect attempts.
   - Resend cooldown: Strict 30-second cooldown enforced by database timestamp.
   - Replay protection: Session tokens are marked consumed upon login.

---

## ⚙️ Environment Variables

Each application contains an `.env.example` file.

### Backend (`backend/.env`)
```ini
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
SECRET_KEY=your-secure-production-secret-key-at-least-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
PORT=8000
HOST=0.0.0.0
FAST2SMS_API_KEY=your_fast2sms_api_key_here
```

### Frontends (`.env` in `farmersfolder/`, `center-app/`, `government/`)
```ini
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 🚀 Setup & Execution

### 1. Database Setup
```bash
# Connect to PostgreSQL and create database
psql -U postgres -c "CREATE DATABASE farmerproc;"
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python seed.py  # Populates centers, crops, quality standards, and test users
uvicorn main:app --reload --port 8000
```

### 3. Frontend Portals Setup
```bash
# Terminal 1: Farmer Portal (:5173)
cd farmersfolder
npm install
npm run dev

# Terminal 2: Mandi Center Console (:5174)
cd center-app
npm install
npm run dev

# Terminal 3: Government Command Center (:5175)
cd government
npm install
npm run dev
```

---

## 🔄 Core Business Workflows

### 1. Procurement Lifecycle State Machine
Every booking follows a strictly validated forward progression:

```mermaid
stateDiagram-v2
    [*] --> BOOKED
    BOOKED --> CHECKED_IN: Arrived at Mandi Gate
    BOOKED --> CANCELLED: Farmer Cancels
    BOOKED --> MISSED_WINDOW: No Show
    
    CHECKED_IN --> IN_QUEUE: Token Issued
    IN_QUEUE --> WEIGHING: Called to Weighbridge
    
    WEIGHING --> QUALITY_CHECK: Weights Recorded
    
    QUALITY_CHECK --> ACCEPTED: Meets Crop Standard
    QUALITY_CHECK --> REJECTED: Exceeds Moisture/Foreign Limits
    REJECTED --> BOOKED: Rescheduled Inspection
    
    ACCEPTED --> PROCUREMENT_CREATED: Quantity & MSP Locked
    PROCUREMENT_CREATED --> PAYMENT_INITIATED: Disbursement Triggered
    
    PAYMENT_INITIATED --> PAYMENT_PROCESSING: Bank Gateway
    PAYMENT_PROCESSING --> PAYMENT_COMPLETED: DBT Success
    PAYMENT_PROCESSING --> PAYMENT_FAILED: Gateway Failure
    PAYMENT_FAILED --> PAYMENT_INITIATED: Center Operator Retry
    
    PAYMENT_COMPLETED --> [*]
```

### 2. Weighing System Validation
- Formula: `net_weight_kg = gross_weight_kg - tare_weight_kg`
- Validations enforced at database & API layers:
  - `gross_weight_kg > 0`
  - `tare_weight_kg >= 0`
  - `gross_weight_kg > tare_weight_kg`
  - `net_weight_kg > 0`
- Variance Warning: Automatically flags disparity if actual weight deviates >20% from declared weight.

### 3. Configurable Quality Check Standards
Quality parameters are evaluated per commodity (Paddy, Wheat, Cotton, Maize, etc.) against official limits:
- Maximum moisture threshold (e.g. 17.0% for Paddy, 12.0% for Wheat).
- Maximum foreign matter threshold (e.g. 2.0% for Paddy, 1.5% for Cotton).
- Damaged and slightly damaged grain tolerances.
- Proportional deduction calculation for accepted produce near tolerance thresholds.

### 4. Idempotent Payment System
- Consecutive POST requests to `/payments/` return the existing payment record rather than creating duplicate disbursements.
- Retry attempts increment an `attempt_count` and log audit events.
- Terminal state `PAYMENT_COMPLETED` prohibits duplicate processing or state reversion.

### 5. WebSocket Queue Reliability
- Sequential `event_id` tracking on all queue dispatches.
- Heartbeat ping/pong (`{"type": "ping"}` / `{"type": "pong"}`) every 20 seconds.
- Automatic exponential backoff reconnection with fallback polling (10s interval).
- State synchronization: Fetches fresh queue data upon reconnection.

### 6. Offline Synchronization Architecture (IndexedDB)
- Operates via IndexedDB database `KisanSevaDB` with object store `offline_requests`.
- Detects browser `online` / `offline` events.
- Queued requests carry UUID idempotency keys.
- **Smart Conflict Handling**: If a selected slot fills up while offline, the synchronization handler automatically locates the next available slot at the same center.

---

## 🧪 Testing & Verification

The platform includes automated test suites covering DQA algorithms, security rules, concurrency, real database queries, and the complete 14-point Phase 23 validation matrix:

```bash
cd backend
venv\Scripts\pytest.exe -v
```

### Test Suite Summary:
- **87 DQA Unit Tests**: Capacity, congestion index, ETA, fairness, priority scoring, simulation.
- **4 Auth Security Tests**: Missing token (401), invalid signature (401), expired token (401), role mismatch (403).
- **2 OTP Tests**: Rate limit (5/hr), lockout after 3 attempts, 30s resend cooldown.
- **1 Concurrency Test**: High-concurrency slot booking race conditions.
- **1 Real Data Test**: PostgreSQL database queries and relations.
- **14 Comprehensive Workflow Tests**: Full procurement lifecycle validation.
- **Total: 109 Tests (100% Passed)**.

### Frontend Production Builds:
All frontends compile cleanly into optimized production bundles:
- `farmersfolder`: `npm run build` (0 errors)
- `center-app`: `npm run build` (0 errors)
- `government`: `npm run build` (0 errors)

---

## 🛡 API Error Envelope Standard

All API errors return a uniform JSON envelope:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_UNAUTHORIZED",
    "message": "Authentication credentials required: No Bearer token provided.",
    "details": {}
  },
  "request_id": "9B3D2F1A7C",
  "detail": "Authentication credentials required: No Bearer token provided."
}
```

---

## 📄 License
Government Agricultural Procurement Demonstration Platform. Built for transparent, inclusive, and concurrency-safe harvest intake.
