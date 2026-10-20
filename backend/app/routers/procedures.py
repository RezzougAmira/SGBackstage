from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.procedure import ProcedureStockee
from ..models.user import User
from ..schemas.procedure import ProcedureCreate, ProcedureResponse
from ..utils import impact
from ..utils.deps import get_current_user, require_deleter, require_writer
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/procedures", tags=["procedures"])


def _serialiser(procedure: ProcedureStockee) -> ProcedureResponse:
    """Convertit une procédure en réponse API, en incluant les services et les
    tables liés (sinon la page ne peut pas montrer « qui l'utilise »)."""
    return ProcedureResponse(
        id=procedure.id,
        nom=procedure.nom,
        description=procedure.description,
        created_at=procedure.created_at,
        updated_at=procedure.updated_at,
        services=[
            {"id": lien.service.id, "nom": lien.service.nom}
            for lien in procedure.services
            if lien.service
        ],
        tables=[
            {"id": lien.table.id, "nom": lien.table.nom}
            for lien in procedure.tables
            if lien.table
        ],
    )


@router.get("/", response_model=List[ProcedureResponse])
def list_procedures(db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    procedures = db.query(ProcedureStockee).all()
    return [_serialiser(p) for p in procedures]


@router.get("/{procedure_id}", response_model=ProcedureResponse)
def get_procedure(procedure_id: int, db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    procedure = db.query(ProcedureStockee).filter(ProcedureStockee.id == procedure_id).first()
    if not procedure:
        raise HTTPException(status_code=404, detail="Procédure non trouvée")
    return _serialiser(procedure)


@router.post("/", response_model=ProcedureResponse, status_code=201)
def create_procedure(
    procedure: ProcedureCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
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
    return _serialiser(db_procedure)


@router.put("/{procedure_id}", response_model=ProcedureResponse)
def update_procedure(
    procedure_id: int,
    procedure: ProcedureCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
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
    return _serialiser(db_procedure)


@router.delete("/{procedure_id}", status_code=204)
def delete_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_deleter),
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
