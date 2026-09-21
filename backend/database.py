import os
import sys

# Ensure UTF-8 stdout on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Explicitly load .env from backend directory, then fallback to current working directory
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_ENV_PATH = os.path.join(_CURRENT_DIR, ".env")
if os.path.exists(_ENV_PATH):
    load_dotenv(dotenv_path=_ENV_PATH)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./farmerproc_test.db"

DATABASE_URL = DATABASE_URL.strip()

# Resilient connection configuration for Aiven Cloud PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=120,
        pool_size=10,
        max_overflow=20,
        connect_args={"connect_timeout": 10}
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    try:
        with engine.connect() as connection:
            print("[SUCCESS] Aiven PostgreSQL connected successfully!")
    except Exception as e:
        print("[ERROR] Database connection failed:")
        print(e)