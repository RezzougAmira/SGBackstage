from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from urllib.parse import quote
from ..database import get_db
from ..models.domaine import Domaine
from ..models.etape import Etape
from ..models.process import Process
from ..models.user import User
from ..schemas.domaine import DomaineCreate, DomaineResponse
from ..schemas.common import PageParams, PaginatedResponse
from ..utils import impact
from ..utils.deps import get_current_user, require_deleter, require_writer
from ..utils.export_docx import build_domaine_document
from ..utils.filenames import slug_fichier
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/domaines", tags=["domaines"])

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _serialize(domaine: Domaine):
    domaine_dict = DomaineResponse.from_orm(domaine)
    domaine_dict.process_count = len(domaine.processes)
    masque_ids = set()
    for process in domaine.processes:
        for etape in process.etapes:
            for em in etape.masques:
                masque_ids.add(em.masque_id)
    domaine_dict.masque_count = len(masque_ids)
    return domaine_dict


@router.get("/", response_model=PaginatedResponse[DomaineResponse])
def list_domaines(
    pagination: PageParams = Depends(),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste paginée des domaines."""
    query = (
        db.query(Domaine)
        .options(
            selectinload(Domaine.processes)
            .selectinload(Process.etapes)
            .selectinload(Etape.masques)
        )
    )
    total = query.count()
    items = (
        query.order_by(Domaine.nom)
        .offset((pagination.page - 1) * pagination.page_size)
        .limit(pagination.page_size)
        .all()
    )
    return PaginatedResponse.create([_serialize(d) for d in items], total, pagination)


@router.get("/{domaine_id}", response_model=DomaineResponse)
def get_domaine(
    domaine_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    domaine = db.query(Domaine).filter(Domaine.id == domaine_id).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")
    return _serialize(domaine)


@router.get("/{domaine_id}/export")
def export_domaine_docx(
    domaine_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Génère le document Word du domaine regroupant tous ses processes (avec
    leurs étapes), côté serveur."""
    domaine = db.query(Domaine).filter(Domaine.id == domaine_id).first()
    if not domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")

    contenu = build_domaine_document(db, domaine)
    nom_fichier = f"domaine-{slug_fichier(domaine.nom)}.docx"
    return Response(
        content=contenu,
        media_type=DOCX_MEDIA_TYPE,
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{nom_fichier}\"; "
                f"filename*=UTF-8''{quote(nom_fichier)}"
            )
        },
    )


@router.post("/", response_model=DomaineResponse, status_code=201)
def create_domaine(
    domaine: DomaineCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    # Vérifier l'unicité du nom
    existing = db.query(Domaine).filter(Domaine.nom == domaine.nom).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un domaine avec ce nom existe déjà"
        )

    db_domaine = Domaine(**domaine.model_dump())
    db.add(db_domaine)
    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_domaine)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="domaine",
        entite_id=db_domaine.id, nom_entite=db_domaine.nom,
        apres=snapshot(db_domaine),
    )
    return db_domaine


@router.put("/{domaine_id}", response_model=DomaineResponse)
def update_domaine(
    domaine_id: int,
    domaine: DomaineCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    db_domaine = db.query(Domaine).filter(Domaine.id == domaine_id).first()
    if not db_domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")

    avant = snapshot(db_domaine)
    for key, value in domaine.model_dump(exclude_unset=True).items():
        setattr(db_domaine, key, value)

    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_domaine)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="domaine",
        entite_id=db_domaine.id, nom_entite=db_domaine.nom,
        avant=avant, apres=snapshot(db_domaine),
    )
    return db_domaine


@router.delete("/{domaine_id}", status_code=204)
def delete_domaine(
    domaine_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_deleter),
):
    db_domaine = db.query(Domaine).filter(Domaine.id == domaine_id).first()
    if not db_domaine:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")

    avant = snapshot(db_domaine)
    db.delete(db_domaine)
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="domaine",
        entite_id=domaine_id, nom_entite=avant.get("nom", "?"),
        avant=avant,
    )
