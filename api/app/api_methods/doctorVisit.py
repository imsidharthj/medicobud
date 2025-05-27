from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

from ..db import get_db
from ..models import DoctorVisit, UserProfile
from ..schemas import DoctorVisitCreate, DoctorVisitResponse, DoctorVisitUpdate

# Define request models
class VisitQueryParams(BaseModel):
    clerk_user_id: str
    email: str
    skip: int = 0
    limit: int = 100
    start_date: Optional[date] = None
    end_date: Optional[date] = None

router = APIRouter(
    prefix="/visits",
    tags=["visits"],
)

@router.post("/", response_model=DoctorVisitResponse, status_code=status.HTTP_201_CREATED)
def create_visit(
    visit: DoctorVisitCreate,
    db: Session = Depends(get_db)
):
    user_profile = db.query(UserProfile).filter(
        UserProfile.email == visit.email
    ).first()
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    db_visit = DoctorVisit(
        user_id=visit.clerk_user_id,
        email=visit.email,
        visit_date=visit.visit_date,
        doctor_name=visit.doctor_name,
        facility_name=visit.facility_name,
        notes=visit.notes
    )
    
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    
    return db_visit

@router.get("/", response_model=List[DoctorVisitResponse])
def get_visits(
    params: VisitQueryParams = Depends(),
    db: Session = Depends(get_db)
):
    user_profile = db.query(UserProfile).filter(
        UserProfile.email == params.email
    ).first()
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    query = db.query(DoctorVisit).filter(DoctorVisit.user_id == params.clerk_user_id)
    
    if params.start_date:
        query = query.filter(DoctorVisit.visit_date >= params.start_date)
    if params.end_date:
        query = query.filter(DoctorVisit.visit_date <= params.end_date)
    
    query = query.order_by(DoctorVisit.visit_date.desc())
    
    visits = query.offset(params.skip).limit(params.limit).all()
    return visits

@router.get("/{visit_id}", response_model=DoctorVisitResponse)
def get_visit(
    visit_id: int,
    clerk_user_id: str,
    email: str,
    db: Session = Depends(get_db)
):
    user_profile = db.query(UserProfile).filter(
        UserProfile.email == email
    ).first()
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    visit = db.query(DoctorVisit).filter(
        DoctorVisit.id == visit_id,
        DoctorVisit.user_id == clerk_user_id
    ).first()
    
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    return visit

@router.put("/{visit_id}", response_model=DoctorVisitResponse)
def update_visit(
    visit_id: int,
    clerk_user_id: str,
    visit_update: DoctorVisitUpdate,
    db: Session = Depends(get_db)
):
    user_profile = db.query(UserProfile).filter(
        UserProfile.email == visit_update.email
    ).first()
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    db_visit = db.query(DoctorVisit).filter(
        DoctorVisit.id == visit_id,
        DoctorVisit.user_id == clerk_user_id
    ).first()
    
    if not db_visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    update_data = visit_update.model_dump(exclude_unset=True, exclude={"email", "clerk_user_id"})
    for field, value in update_data.items():
        setattr(db_visit, field, value)
    
    db.commit()
    db.refresh(db_visit)
    
    return db_visit

@router.delete("/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_visit(
    visit_id: int,
    clerk_user_id: str,
    email: str,
    db: Session = Depends(get_db)
):
    user_profile = db.query(UserProfile).filter(
        UserProfile.email == email
    ).first()
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    db_visit = db.query(DoctorVisit).filter(
        DoctorVisit.id == visit_id,
        DoctorVisit.user_id == clerk_user_id
    ).first()
    
    if not db_visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor visit not found"
        )
    
    db.delete(db_visit)
    db.commit()
    
    return None