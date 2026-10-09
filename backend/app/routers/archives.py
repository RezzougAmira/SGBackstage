from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.archive import Archive
from ..models.user import User
from ..schemas.archive import ArchiveCreate, ArchiveResponse
from ..utils.deps import get_current_user
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/archives", tags=["archives"])


@router.get("/", response_model=List[ArchiveResponse])
def list_archives(db: Session = Depends(get_db)):
    archives = db.query(Archive).order_by(Archive.date_push.desc()).all()
    return [ArchiveResponse.from_orm(a) for a in archives]


@router.get("/{archive_id}")
def get_archive(archive_id: int, db: Session = Depends(get_db)):
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Archive non trouvée")

    return {
        "id": archive.id,
        "identifiant": archive.identifiant,
        "date_push": archive.date_push,
    }


@router.post("/", response_model=ArchiveResponse, status_code=201)
def create_archive(
    archive: ArchiveCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(Archive).filter(Archive.identifiant == archive.identifiant).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cette archive existe déjà")

    db_archive = Archive(**archive.model_dump())
    db.add(db_archive)
    db.commit()
    db.refresh(db_archive)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="archive",
        entite_id=db_archive.id, nom_entite=db_archive.identifiant,
        apres=snapshot(db_archive),
    )
    return db_archive
