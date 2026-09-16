from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.masque import Masque
from ..schemas.masque import MasqueCreate, MasqueResponse

router = APIRouter(prefix="/api/masques", tags=["masques"])


@router.get("/", response_model=List[MasqueResponse])
def list_masques(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Masque)
    if search:
        query = query.filter(Masque.code.ilike(f"%{search}%"))
    return [MasqueResponse.from_orm(m) for m in query.all()]


@router.get("/{masque_id}", response_model=MasqueResponse)
def get_masque(masque_id: int, db: Session = Depends(get_db)):
    masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")
    return MasqueResponse.from_orm(masque)


@router.post("/", response_model=MasqueResponse, status_code=201)
def create_masque(masque: MasqueCreate, db: Session = Depends(get_db)):
    existing = db.query(Masque).filter(Masque.code == masque.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un masque avec ce code existe déjà"
        )

    db_masque = Masque(**masque.model_dump())
    db.add(db_masque)
    db.commit()
    db.refresh(db_masque)
    return db_masque


@router.put("/{masque_id}", response_model=MasqueResponse)
def update_masque(masque_id: int, masque: MasqueCreate, db: Session = Depends(get_db)):
    db_masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not db_masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")

    for key, value in masque.model_dump(exclude_unset=True).items():
        setattr(db_masque, key, value)

    db.commit()
    db.refresh(db_masque)
    return db_masque


@router.delete("/{masque_id}", status_code=204)
def delete_masque(masque_id: int, db: Session = Depends(get_db)):
    db_masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not db_masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")

    db.delete(db_masque)
    db.commit()
