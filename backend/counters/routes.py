from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Counter, ProcurementCenter, User
from schemas import CounterCreate, CounterUpdate, CounterResponse
from auth.dependencies import get_current_user, require_role

router = APIRouter(
    prefix="",
    tags=["Counters"]
)

@router.get("/centers/{center_id}/counters", response_model=List[CounterResponse])
def get_counters(
    center_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all counters for a given centre.
    Accessible to any authenticated user.
    """
    center = db.query(ProcurementCenter).filter(ProcurementCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
        
    counters = db.query(Counter).filter(Counter.center_id == center_id).all()
    return counters


@router.post("/centers/{center_id}/counters", response_model=CounterResponse)
def create_counter(
    center_id: int,
    counter_data: CounterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """
    Create a new counter for a given centre.
    Guarded by ADMIN role.
    """
    center = db.query(ProcurementCenter).filter(ProcurementCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
        
    new_counter = Counter(
        center_id=center_id,
        name=counter_data.name,
        specialty_crop=counter_data.specialty_crop,
        accepts_general_when_idle=counter_data.accepts_general_when_idle,
        status=counter_data.status
    )
    
    db.add(new_counter)
    db.commit()
    db.refresh(new_counter)
    
    return new_counter


@router.patch("/counters/{counter_id}", response_model=CounterResponse)
def update_counter(
    counter_id: int,
    updates: CounterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("CENTER_OPERATOR"))
):
    """
    Update counter status or specialty.
    Accessible to CENTER_OPERATOR (and ADMIN via role hierarchy).
    """
    counter = db.query(Counter).filter(Counter.id == counter_id).first()
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")
        
    if updates.specialty_crop is not None:
        counter.specialty_crop = updates.specialty_crop
    
    if updates.accepts_general_when_idle is not None:
        counter.accepts_general_when_idle = updates.accepts_general_when_idle
        
    if updates.status is not None:
        counter.status = updates.status
        
    db.commit()
    db.refresh(counter)
    
    return counter
