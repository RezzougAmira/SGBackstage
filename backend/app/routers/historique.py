from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.historique import Historique
from ..models.user import User
from ..utils.deps import get_current_user
from ..utils.export_dossier_docx import build_dossier_document
from ..utils.filenames import slug_fichier

router = APIRouter(prefix="/api/historique", tags=["historique"])

DOCX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

# Types pour lesquels le journal est assez riche pour produire un dossier
# Word (fiche + événements). Les autres types ne disposent pas de fiche.
TYPES_EXPORTABLES = {"masque", "service", "procedure"}


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
    search: Optional[str] = None,
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

    if search:
        terme = f"%{search}%"
        query = (
            query.outerjoin(User, User.id == Historique.utilisateur_id)
            .filter(
                or_(
                    Historique.nom_entite.ilike(terme),
                    Historique.type_entite.ilike(terme),
                    Historique.action.ilike(terme),
                    User.name.ilike(terme),
                )
            )
        )

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


@router.get("/utilisateurs")
def utilisateurs_du_journal(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Utilisateurs déjà présents dans le journal, pour le filtre.

    Contrairement à GET /api/auth/users (réservé aux admins), cette route est
    ouverte à tous les rôles : la page Journal est accessible à tous, seul le
    choix des utilisateurs à afficher doit y être disponible.
    """
    lignes = (
        db.query(
            User.id,
            User.name,
            User.avatar_key,
            func.count(Historique.id).label("nb"),
        )
        .join(Historique, Historique.utilisateur_id == User.id)
        .group_by(User.id, User.name, User.avatar_key)
        .order_by(User.name)
        .all()
    )
    return [
        {
            "id": uid,
            "name": name,
            "avatar_key": avatar_key,
            "evenements": nb,
        }
        for uid, name, avatar_key, nb in lignes
    ]


@router.get("/export/{type_entite}/{entite_id}")
def export_dossier_docx(
    type_entite: str,
    entite_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Dossier Word d'un objet : fiche courante + journal complet.

    Même un objet supprimé produit un document : le journal conserve les
    instantanés avant/après de chaque événement.
    """
    if type_entite not in TYPES_EXPORTABLES:
        raise HTTPException(
            status_code=404,
            detail=f"Export non disponible pour le type « {type_entite} ».",
        )

    try:
        contenu, nom_objet = build_dossier_document(db, type_entite, entite_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    base = slug_fichier(nom_objet or f"{type_entite}-{entite_id}")
    nom_fichier = f"dossier-{base}.docx"
    return Response(
        content=contenu,
        media_type=DOCX_MEDIA_TYPE,
        headers={
            "Content-Disposition": f'attachment; filename="{nom_fichier}"',
        },
    )