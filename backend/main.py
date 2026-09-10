from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from contextlib import asynccontextmanager

from database import engine, Base
import models
from seed import seed_database

from auth.routes import router as auth_router
from farmers.routes import router as farmer_router
from centers.routes import router as center_router
from slots.routes import router as slot_router
from bookings.routes import router as booking_router
from task_queue.routes import router as queue_router
from procurement.routes import router as procurement_router
from payments.routes import router as payment_router
from notifications.routes import router as notification_router
from crops.routes import router as crop_router
from checkin.routes import router as checkin_router
from weighing.routes import router as weighing_router
from quality.routes import router as quality_router
from msp.routes import router as msp_router
from grievances.routes import router as grievance_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables exist & seed essential data
    try:
        print("Connecting to Aiven Cloud PostgreSQL and creating tables...")
        Base.metadata.create_all(bind=engine)
        print("Running initial database seed...")
        seed_database()
        print("Database initialized and ready.")
    except Exception as e:
        print(f"Warning during database initialization: {e}")
    yield


app = FastAPI(
    title="FarmerProc API",
    description="Unified Agricultural Procurement Backend API",
    version="1.0.0",
    lifespan=lifespan
)


# =========================================================
# CORS - ALLOW ALL LOCAL DEV FRONTENDS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTES
# =========================================================

app.include_router(auth_router)
app.include_router(farmer_router)
app.include_router(center_router)
app.include_router(slot_router)
app.include_router(booking_router)
app.include_router(queue_router)
app.include_router(procurement_router)
app.include_router(payment_router)
app.include_router(notification_router)
app.include_router(crop_router)
app.include_router(checkin_router)
app.include_router(weighing_router)
app.include_router(quality_router)
app.include_router(msp_router)
app.include_router(grievance_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "FarmerProc API is running",
        "docs": "/docs",
        "status": "healthy"
    }


# =========================================================
# DATABASE TEST & HEALTH
# =========================================================

@app.get("/db-test")
def database_test():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        center_count = connection.execute(text("SELECT count(*) FROM procurement_centers")).scalar()
        user_count = connection.execute(text("SELECT count(*) FROM users")).scalar()
        booking_count = connection.execute(text("SELECT count(*) FROM bookings")).scalar()

        return {
            "database": "connected",
            "provider": "Aiven Cloud PostgreSQL",
            "ping": result.scalar(),
            "counts": {
                "centers": center_count,
                "users": user_count,
                "bookings": booking_count,
            }
        }