from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.domaine import Domaine
from ..models.process import Process
from ..schemas.domaine import DomaineCreate, DomaineResponse

router = APIRouter(prefix="/api/domaines", tags=["domaines"])


@router.get("/", response_model=List[DomaineResponse])
def list_domaines(db: Session = Depends(get_db)):
    domaines = db.query(Domaine).all()
    result = []
    for domaine in domaines:
        domaine_dict = DomaineResponse.from_orm(domaine)
        domaine_dict.process_count = len(domaine.processes)
        result.append(domaine_dict)
    return result


@router.get("/{domaine_id}", response_model=DomaineResponse)
def get_domaine(domaine_id: int, db: Session = Depends(get_db)):
    domaine = db.query(Domaine).filter(Domaine.id == domaine_id).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")
    domaine_dict = DomaineResponse.from_orm(domaine)
    domaine_dict.process_count = len(domaine.processes)
    return domaine_dict


@router.post("/", response_model=DomaineResponse, status_code=201)
def create_domaine(domaine: DomaineCreate, db: Session = Depends(get_db)):
    # Vérifier l'unicité du nom
    existing = db.query(Domaine).filter(Domaine.nom == domaine.nom).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un domaine avec ce nom existe déjà"
        )

    db_domaine = Domaine(**domaine.model_dump())
    db.add(db_domaine)
    db.commit()
    db.refresh(db_domaine)
    return db_domaine


@router.put("/{domaine_id}", response_model=DomaineResponse)
def update_domaine(domaine_id: int, domaine: DomaineCreate, db: Session = Depends(get_db)):
    db_domaine = db.query(Domaine).filter(Domaine.id == domaine_id).first()
    if not db_domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")

    for key, value in domaine.model_dump(exclude_unset=True).items():
        setattr(db_domaine, key, value)

    db.commit()
    db.refresh(db_domaine)
    return db_domaine


@router.delete("/{domaine_id}", status_code=204)
def delete_domaine(domaine_id: int, db: Session = Depends(get_db)):
    db_domaine = db.query(Domaine).filter(Domaine.id == domaine_id).first()
    if not db_domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")

    db.delete(db_domaine)
    db.commit()
