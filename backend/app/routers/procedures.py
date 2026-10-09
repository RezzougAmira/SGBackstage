from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.procedure import ProcedureStockee
from ..models.user import User
from ..schemas.procedure import ProcedureCreate, ProcedureResponse
from ..utils import impact
from ..utils.deps import get_current_user
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/procedures", tags=["procedures"])


@router.get("/", response_model=List[ProcedureResponse])
def list_procedures(db: Session = Depends(get_db)):
    procedures = db.query(ProcedureStockee).all()
    return [ProcedureResponse.from_orm(p) for p in procedures]


@router.get("/{procedure_id}", response_model=ProcedureResponse)
def get_procedure(procedure_id: int, db: Session = Depends(get_db)):
    procedure = db.query(ProcedureStockee).filter(ProcedureStockee.id == procedure_id).first()
    if not procedure:
        raise HTTPException(status_code=404, detail="Procédure non trouvée")
    return ProcedureResponse.from_orm(procedure)


@router.post("/", response_model=ProcedureResponse, status_code=201)
def create_procedure(
    procedure: ProcedureCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db_procedure = ProcedureStockee(**procedure.model_dump())
    db.add(db_procedure)
    db.commit()
    db.refresh(db_procedure)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="procedure",
        entite_id=db_procedure.id, nom_entite=db_procedure.nom,
        apres=snapshot(db_procedure),
    )
    return db_procedure


@router.put("/{procedure_id}", response_model=ProcedureResponse)
def update_procedure(
    procedure_id: int,
    procedure: ProcedureCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db_procedure = db.query(ProcedureStockee).filter(ProcedureStockee.id == procedure_id).first()
    if not db_procedure:
        raise HTTPException(status_code=404, detail="Procédure non trouvée")

    avant = snapshot(db_procedure)
    for key, value in procedure.model_dump(exclude_unset=True).items():
        setattr(db_procedure, key, value)

    db.commit()
    db.refresh(db_procedure)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="procedure",
        entite_id=db_procedure.id, nom_entite=db_procedure.nom,
        avant=avant, apres=snapshot(db_procedure),
    )
    return db_procedure


@router.delete("/{procedure_id}", status_code=204)
def delete_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Supprime la procédure stockée et ses liens.
    """
    db_procedure = db.query(ProcedureStockee).filter(ProcedureStockee.id == procedure_id).first()
    if not db_procedure:
        raise HTTPException(status_code=404, detail="Procédure non trouvée")

    avant = snapshot(db_procedure)
    db.delete(db_procedure)
    db.commit()
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="procedure",
        entite_id=procedure_id, nom_entite=avant.get("nom", "?"),
        avant=avant,
    )
