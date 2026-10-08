from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.historique import Historique
from ..models.user import User
from ..utils.deps import get_current_user

router = APIRouter(prefix="/api/historique", tags=["historique"])


def _serialiser(h: Historique) -> dict:
    return {
        "id": h.id,
        "utilisateur": {
            "id": h.utilisateur.id,
            "name": h.utilisateur.name,
            "avatar_key": h.utilisateur.avatar_key,
        }
        if h.utilisateur
        else None,
        "action": h.action,
        "type_entite": h.type_entite,
        "entite_id": h.entite_id,
        "nom_entite": h.nom_entite,
        "avant": h.avant,
        "apres": h.apres,
        "created_at": h.created_at,
    }


@router.get("/")
def list_historique(
    action: Optional[str] = None,
    type_entite: Optional[str] = None,
    entite_id: Optional[int] = None,
    utilisateur_id: Optional[int] = None,
    depuis: Optional[str] = None,
    jusqua: Optional[str] = None,
    page: int = Query(1, ge=1),
    par_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Journal des changements, du plus récent au plus ancien."""
    query = db.query(Historique)

    if action:
        query = query.filter(Historique.action == action)
    if type_entite:
        query = query.filter(Historique.type_entite == type_entite)
    if entite_id is not None:
        query = query.filter(Historique.entite_id == entite_id)
    if utilisateur_id is not None:
        query = query.filter(Historique.utilisateur_id == utilisateur_id)
    if depuis:
        query = query.filter(
            Historique.created_at >= datetime.fromisoformat(depuis)
        )
    if jusqua:
        query = query.filter(Historique.created_at <= datetime.fromisoformat(jusqua))

    total = query.count()
    lignes = (
        query.order_by(Historique.created_at.desc(), Historique.id.desc())
        .offset((page - 1) * par_page)
        .limit(par_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "par_page": par_page,
        "evenements": [_serialiser(h) for h in lignes],
    }