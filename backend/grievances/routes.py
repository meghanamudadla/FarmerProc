from datetime import datetime
import json
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Farmer, Grievance
from schemas import (
    GrievanceCreate,
    GrievanceUpdate,
    GrievanceResponse
)
from auth.dependencies import get_current_user, require_role


router = APIRouter(
    prefix="/grievances",
    tags=["Grievances"]
)


# ============================================================
# CREATE GRIEVANCE - FARMER
# ============================================================

@router.post("/", response_model=GrievanceResponse)
def create_grievance(
    data: GrievanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    complaint_id = f"CMP-{datetime.utcnow().year}-{random.randint(10000, 99999)}"

    audit_entry = [{
        "status": "SUBMITTED",
        "officer": None,
        "response": None,
        "timestamp": datetime.utcnow().isoformat()
    }]

    grievance = Grievance(
        complaint_id=complaint_id,
        farmer_id=farmer.id,
        transaction_id=data.transaction_id or "GENERAL_PROCUREMENT",
        category=data.category,
        description=data.description,
        urgency=data.urgency,
        attachment_name=data.attachment_name,
        status="SUBMITTED",
        audit_trail=json.dumps(audit_entry)
    )

    db.add(grievance)
    db.commit()
    db.refresh(grievance)

    return grievance


# ============================================================
# GET MY GRIEVANCES - FARMER
# ============================================================

@router.get("/mine", response_model=list[GrievanceResponse])
def get_my_grievances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found"
        )

    return db.query(Grievance).filter(
        Grievance.farmer_id == farmer.id
    ).order_by(
        Grievance.created_at.desc()
    ).all()


# ============================================================
# GET ALL GRIEVANCES - GOVERNMENT / ADMIN
# ============================================================

@router.get("/all", response_model=list[GrievanceResponse])
def get_all_grievances(
    db: Session = Depends(get_db)
):
    return db.query(Grievance).order_by(Grievance.created_at.desc()).all()


# ============================================================
# GET SINGLE GRIEVANCE - FARMER
# ============================================================

@router.get("/{complaint_id}", response_model=GrievanceResponse)
def get_grievance(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    grievance = db.query(Grievance).filter(
        Grievance.complaint_id == complaint_id
    ).first()

    if not grievance:
        raise HTTPException(
            status_code=404,
            detail="Grievance not found"
        )

    farmer = db.query(Farmer).filter(
        Farmer.user_id == current_user.id
    ).first()

    if not farmer or grievance.farmer_id != farmer.id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to view this grievance"
        )

    return grievance


# ============================================================
# UPDATE GRIEVANCE - STAFF
# ============================================================

@router.patch("/{complaint_id}", response_model=GrievanceResponse)
def update_grievance(
    complaint_id: str,
    data: GrievanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "CENTER_OPERATOR"
        )
    )
):
    grievance = db.query(Grievance).filter(
        Grievance.complaint_id == complaint_id
    ).first()

    if not grievance:
        raise HTTPException(
            status_code=404,
            detail="Grievance not found"
        )

    allowed_statuses = {
        "SUBMITTED",
        "ASSIGNED",
        "UNDER_REVIEW",
        "RESOLVED",
        "REJECTED",
        "REOPENED"
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid grievance status"
        )

    grievance.status = data.status

    if data.assigned_department is not None:
        grievance.assigned_department = data.assigned_department

    if data.assigned_officer is not None:
        grievance.assigned_officer = data.assigned_officer

    if data.official_response is not None:
        grievance.official_response = data.official_response

    if data.resolution_details is not None:
        grievance.resolution_details = data.resolution_details

    try:
        audit_trail = json.loads(grievance.audit_trail or "[]")
    except json.JSONDecodeError:
        audit_trail = []

    audit_trail.append({
        "status": data.status,
        "officer": current_user.name,
        "response": data.official_response,
        "timestamp": datetime.utcnow().isoformat()
    })

    grievance.audit_trail = json.dumps(audit_trail)
    grievance.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(grievance)

    return grievance