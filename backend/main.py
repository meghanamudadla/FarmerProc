from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
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
from analytics.routes import router as analytics_router
from audit_log.routes import router as audit_log_router
from counters.routes import router as counter_router
from fastapi import WebSocket, WebSocketDisconnect
from task_queue.manager import manager


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


from config import CORS_ALLOWED_ORIGINS, ENVIRONMENT

cors_kwargs = {
    "allow_origins": CORS_ALLOWED_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["*"],
}

if ENVIRONMENT != "production":
    cors_kwargs["allow_origin_regex"] = r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$"

app.add_middleware(
    CORSMiddleware,
    **cors_kwargs
)


# =========================================================
# STRUCTURED LOGGING & ERROR HANDLING MIDDLEWARE
# =========================================================

import time
import uuid
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger("farmerproc.api")


@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:10].upper()
    request.state.request_id = request_id
    start_time = time.time()

    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id

    path = request.url.path
    if not (path.endswith((".js", ".css", ".png", ".ico")) or "/docs" in path or "/openapi.json" in path):
        logger.info(
            f"req_id={request_id} method={request.method} path={path} "
            f"status={response.status_code} duration={duration_ms}ms"
        )
    return response


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", uuid.uuid4().hex[:10].upper())
    
    code = "HTTP_ERROR"
    msg = str(exc.detail)
    if exc.status_code == 401:
        code = "AUTH_UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "AUTH_FORBIDDEN"
    elif exc.status_code == 404:
        code = "RESOURCE_NOT_FOUND"
    elif exc.status_code == 400:
        if "slot" in msg.lower() or "capacity" in msg.lower():
            code = "BOOKING_SLOT_FULL"
        elif "weigh" in msg.lower() or "tare" in msg.lower():
            code = "WEIGHING_INVALID"
        elif "quality" in msg.lower() or "moisture" in msg.lower():
            code = "QUALITY_CHECK_INVALID"
        elif "payment" in msg.lower():
            code = "PAYMENT_ERROR"
        elif "state" in msg.lower() or "transition" in msg.lower():
            code = "INVALID_STATE_TRANSITION"
        else:
            code = "BAD_REQUEST"
    elif exc.status_code == 409:
        code = "CONFLICT"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": msg,
                "details": {}
            },
            "request_id": request_id,
            "detail": exc.detail
        },
        headers={"X-Request-ID": request_id}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", uuid.uuid4().hex[:10].upper())
    errors = exc.errors()
    formatted = [{"field": " -> ".join(str(l) for l in err.get("loc", [])), "message": err.get("msg")} for err in errors]
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed",
                "details": {"validation_errors": formatted}
            },
            "request_id": request_id,
            "detail": errors
        },
        headers={"X-Request-ID": request_id}
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
app.include_router(analytics_router)
app.include_router(audit_log_router)
app.include_router(counter_router)


@app.websocket("/center/{center_id}/ws")
async def center_ws_alias(
    websocket: WebSocket,
    center_id: int
):
    await manager.connect(websocket, center_id)
    try:
        while True:
            text = await websocket.receive_text()
            if "ping" in text:
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, center_id)
    except Exception:
        manager.disconnect(websocket, center_id)


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