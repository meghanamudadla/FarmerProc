"""
FarmerProc Central Configuration Module
Provides centralized, validated configuration for database, JWT security,
OTP rules, carrier gateways, and CORS policies across all environments.
"""
import os
import sys
from dotenv import load_dotenv

# Explicitly load .env from backend directory first, then fallback
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_ENV_PATH = os.path.join(_BACKEND_DIR, ".env")
if os.path.exists(_ENV_PATH):
    load_dotenv(dotenv_path=_ENV_PATH)
load_dotenv()

# Environment type: "development", "production", "test"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./farmerproc_test.db").strip()

# JWT Authentication Security
_KNOWN_INSECURE_SECRETS = {
    "FARMER_PROC",
    "development-secret",
    "secret",
    "changeme",
    "admin",
    "123456",
}

SECRET_KEY = os.getenv("SECRET_KEY")

if ENVIRONMENT == "production":
    if not SECRET_KEY or SECRET_KEY in _KNOWN_INSECURE_SECRETS:
        raise RuntimeError(
            "FATAL CONFIGURATION ERROR: SECRET_KEY must be a cryptographically secure "
            "random string in production. Hardcoded default or weak secrets are prohibited."
        )
else:
    # Development fallback
    if not SECRET_KEY:
        SECRET_KEY = "farmerproc-local-dev-fallback-secret-key-32charsmin!"
    elif SECRET_KEY in _KNOWN_INSECURE_SECRETS:
        # Normalize to avoid mismatch between different route modules
        SECRET_KEY = "farmerproc-unified-dev-secret-key-for-local-use"

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 24 hours

# OTP Security Policies
OTP_SESSION_TTL_SECONDS = int(os.getenv("OTP_SESSION_TTL_SECONDS", "300"))  # 5 minutes
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
OTP_MAX_REQUESTS_PER_HOUR = int(os.getenv("OTP_MAX_REQUESTS_PER_HOUR", "5"))

# Multi-Carrier Telecom Gateways
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")
TWO_FACTOR_API_KEY = os.getenv("TWO_FACTOR_API_KEY", "")
TWO_FACTOR_BASE_URL = os.getenv("TWO_FACTOR_BASE_URL", "https://2factor.in/API/V1")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY", "")
MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID", "")
EXOTEL_SID = os.getenv("EXOTEL_SID", "")
EXOTEL_API_KEY = os.getenv("EXOTEL_API_KEY", "")
EXOTEL_API_TOKEN = os.getenv("EXOTEL_API_TOKEN", "")
EXOTEL_CALLER_ID = os.getenv("EXOTEL_CALLER_ID", "08047104000")
TEXTLOCAL_API_KEY = os.getenv("TEXTLOCAL_API_KEY", "")
SMS_GATEWAY_WEBHOOK_URL = os.getenv("SMS_GATEWAY_WEBHOOK_URL", "")

# Explicit CORS Allowed Origins
DEFAULT_DEV_ORIGINS = [
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
    "https://farmer-proc.vercel.app",
    "https://center-app-chi.vercel.app",
    "https://kisanseva-govt.vercel.app",
]

_custom_origins = os.getenv("CORS_ALLOWED_ORIGINS")
if _custom_origins:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _custom_origins.split(",") if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = DEFAULT_DEV_ORIGINS
