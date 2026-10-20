from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.process import Process
from ..models.etape import Etape
from ..models.user import User
from ..schemas.process import ProcessCreate, ProcessUpdate, ProcessResponse
from ..utils import impact
from ..utils.deps import require_deleter, require_writer
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/domaines/{domaine_id}/processes", tags=["processes"])


@router.get("/", response_model=List[ProcessResponse])
def list_processes(domaine_id: int, db: Session = Depends(get_db)):
    processes = db.query(Process).filter(Process.domaine_id == domaine_id).all()
    result = []
    for process in processes:
        process_dict = ProcessResponse.from_orm(process)
        process_dict.etape_count = len(process.etapes)
        result.append(process_dict)
    return result


@router.get("/{process_id}", response_model=ProcessResponse)
def get_process(domaine_id: int, process_id: int, db: Session = Depends(get_db)):
    process = db.query(Process).filter(
        Process.id == process_id,
        Process.domaine_id == domaine_id
    ).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process non trouvé")
    process_dict = ProcessResponse.from_orm(process)
    process_dict.etape_count = len(process.etapes)
    return process_dict


@router.post("/", response_model=ProcessResponse, status_code=201)
def create_process(
    domaine_id: int,
    process: ProcessCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    # Deux process portent le même nom dans un même domaine
    existing = (
        db.query(Process)
        .filter(Process.domaine_id == domaine_id, Process.nom == process.nom)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un process avec ce nom existe déjà dans ce domaine"
        )

    db_process = Process(**{**process.model_dump(), "domaine_id": domaine_id})
    db.add(db_process)
    db.commit()
    db.refresh(db_process)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="process",
        entite_id=db_process.id, nom_entite=db_process.nom,
        apres=snapshot(db_process),
    )
    return db_process


@router.put("/{process_id}", response_model=ProcessResponse)
def update_process(
    domaine_id: int,
    process_id: int,
    process: ProcessUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    db_process = db.query(Process).filter(
        Process.id == process_id,
        Process.domaine_id == domaine_id
    ).first()
    if not db_process:
        raise HTTPException(status_code=404, detail="Process non trouvé")

    avant = snapshot(db_process)
    for key, value in process.model_dump(exclude_unset=True).items():
        setattr(db_process, key, value)

    db.commit()
    db.refresh(db_process)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="process",
        entite_id=db_process.id, nom_entite=db_process.nom,
        avant=avant, apres=snapshot(db_process),
    )
    return db_process


@router.delete("/{process_id}", status_code=204)
def delete_process(
    domaine_id: int,
    process_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_deleter),
):
    db_process = db.query(Process).filter(
        Process.id == process_id,
        Process.domaine_id == domaine_id
    ).first()
    if not db_process:
        raise HTTPException(status_code=404, detail="Process non trouvé")

    avant = snapshot(db_process)
    db.delete(db_process)
    db.commit()
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="process",
        entite_id=process_id, nom_entite=avant.get("nom", "?"),
        avant=avant,
    )
