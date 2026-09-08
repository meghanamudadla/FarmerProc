from fastapi import FastAPI
from sqlalchemy import text
from auth.routes import router as auth_router
from database import engine
from database import Base
from farmers.routes import router as farmer_router
from centers.routes import router as center_router

import models


app = FastAPI(
    title="FarmerProc API",
    description="Backend API for FarmerProc SIH Project",
    version="1.0.0"
)



Base.metadata.create_all(bind=engine)
app.include_router(auth_router)
app.include_router(farmer_router)
app.include_router(center_router)


@app.get("/")
def root():
    return {
        "message": "FarmerProc API is running"
    }


@app.get("/db-test")
def database_test():

    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "result": result.scalar()
        }