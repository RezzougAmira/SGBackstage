from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models.fonctionnalite import Fonctionnalite, FonctionnaliteService
from ..models.masque import Masque
from ..models.service import Service
from ..models.procedure import ServiceProcedure, ProcedureStockee
from ..models.table import ProcedureTable
from ..models.user import User
from ..utils.deps import get_current_user, require_deleter, require_writer
from ..utils.historique import enregistrer_historique, snapshot
from ..schemas.fonctionnalite import (
    FonctionnaliteCreate,
    FonctionnaliteUpdate,
    FonctionnaliteResponse,
    ServiceRef,
    ProcedureRef,
    TableRef,
)
from ..schemas.common import PageParams, PaginatedResponse

router = APIRouter(prefix="/api/fonctionnalites", tags=["fonctionnalites"])


def _options_chargement():
    """joinedload services + procédures + tables d'un coup.

    Sans ces joinedloads, les relations sont chargées paresseusement et
    disparaissent à la fermeture de la session (session-scoped FastAPI).
    """
    return (
        joinedload(Fonctionnalite.services)
        .joinedload(FonctionnaliteService.service)
        .joinedload(Service.procedures)
        .joinedload(ServiceProcedure.procedure),
        joinedload(Fonctionnalite.services)
        .joinedload(FonctionnaliteService.service)
        .joinedload(Service.procedures)
        .joinedload(ServiceProcedure.procedure)
        .joinedload(ProcedureStockee.tables)
        .joinedload(ProcedureTable.table),
    )


def _charger_avec(db: Session, fonctionnalite_id: int):
    return (
        db.query(Fonctionnalite)
        .options(*_options_chargement())
        .filter(Fonctionnalite.id == fonctionnalite_id)
        .first()
    )


def _serialiser(fonctionnalite: Fonctionnalite) -> dict:
    """ORM -> JSON.

    `Fonctionnalite.services` est une liste de FonctionnaliteService (la table
    de liaison many-to-many), pas de Service : il faut l'aplatir pour exposer
    le service, ses détails et ses procédures stockées.
    """
    services = []
    for liaison in fonctionnalite.services:
        service = liaison.service
        if service is None:
            continue
        services.append(
            ServiceRef(
                id=service.id,
                nom=service.nom,
                methode_http=service.methode_http,
                url=service.url,
                input_desc=service.input_desc,
                output_desc=service.output_desc,
                controleur=service.controleur,
                procedures=[
                    ProcedureRef(
                        id=lp.procedure.id,
                        nom=lp.procedure.nom,
                        description=lp.procedure.description,
                        tables=[
                            TableRef(id=pt.table.id, nom=pt.table.nom)
                            for pt in lp.procedure.tables
                            if pt.table is not None
                        ],
                    )
                    for lp in service.procedures
                    if lp.procedure is not None
                ],
            )
        )

    return FonctionnaliteResponse(
        id=fonctionnalite.id,
        titre=fonctionnalite.titre,
        description=fonctionnalite.description,
        masque_id=fonctionnalite.masque_id,
        ordre=fonctionnalite.ordre,
        services=services,
        created_at=fonctionnalite.created_at,
        updated_at=fonctionnalite.updated_at,
    ).model_dump()


@router.get("/masque/{masque_id}", response_model=PaginatedResponse[FonctionnaliteResponse])
def list_par_masque(
    masque_id: int,
    pagination: PageParams = Depends(),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Fonctionnalités paginées d'un masque, dans l'ordre saisi."""
    query = (
        db.query(Fonctionnalite)
        .options(*_options_chargement())
        .filter(Fonctionnalite.masque_id == masque_id)
        .order_by(Fonctionnalite.ordre, Fonctionnalite.id)
    )
    total = query.count()
    items = (
        query.offset((pagination.page - 1) * pagination.page_size)
        .limit(pagination.page_size)
        .all()
    )
    return PaginatedResponse.create([_serialiser(f) for f in items], total, pagination)


@router.get("/{fonctionnalite_id}", response_model=FonctionnaliteResponse)
def get_fonctionnalite(fonctionnalite_id: int, db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    fonctionnalite = _charger_avec(db, fonctionnalite_id)
    if not fonctionnalite:
        raise HTTPException(status_code=404, detail="Fonctionnalité non trouvée")
    return _serialiser(fonctionnalite)


@router.post("/masque/{masque_id}", response_model=FonctionnaliteResponse, status_code=201)
def create_fonctionnalite(
    masque_id: int,
    payload: FonctionnaliteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")

    titre = (payload.titre or "").strip()
    if not titre:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le titre ne peut pas être vide",
        )

    ordre = payload.ordre
    if ordre is None:
        dernier = (
            db.query(Fonctionnalite)
            .filter(Fonctionnalite.masque_id == masque_id)
            .order_by(Fonctionnalite.ordre.desc())
            .first()
        )
        ordre = (dernier.ordre + 1) if dernier else 0

    fonctionnalite = Fonctionnalite(
        titre=titre,
        description=payload.description,
        masque_id=masque_id,
        ordre=ordre,
    )
    db.add(fonctionnalite)
    db.flush()  # transaction ouverte : commit au journal
    db.refresh(fonctionnalite)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="fonctionnalite",
        entite_id=fonctionnalite.id, nom_entite=fonctionnalite.titre,
        apres=snapshot(fonctionnalite),
    )
    return _serialiser(_charger_avec(db, fonctionnalite.id) or fonctionnalite)


@router.patch("/{fonctionnalite_id}", response_model=FonctionnaliteResponse)
def update_fonctionnalite(
    fonctionnalite_id: int,
    payload: FonctionnaliteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    fonctionnalite = db.query(Fonctionnalite).filter(
        Fonctionnalite.id == fonctionnalite_id
    ).first()
    if not fonctionnalite:
        raise HTTPException(status_code=404, detail="Fonctionnalité non trouvée")

    donnees = payload.model_dump(exclude_unset=True)
    avant = snapshot(fonctionnalite)

    if "titre" in donnees:
        titre = (donnees["titre"] or "").strip()
        if not titre:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Le titre ne peut pas être vide",
            )
        fonctionnalite.titre = titre

    for champ in ("description", "ordre"):
        if champ in donnees:
            setattr(fonctionnalite, champ, donnees[champ])

    db.flush()  # transaction ouverte : commit au journal
    db.refresh(fonctionnalite)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="fonctionnalite",
        entite_id=fonctionnalite.id, nom_entite=fonctionnalite.titre,
        avant=avant, apres=snapshot(fonctionnalite),
    )
    return _serialiser(_charger_avec(db, fonctionnalite.id) or fonctionnalite)


@router.delete("/{fonctionnalite_id}")
def delete_fonctionnalite(
    fonctionnalite_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_deleter),
):
    """Supprime la fonctionnalité et ses liaisons.

    Les services ne sont pas touchés : une fonctionnalité retirée ne doit pas
    faire disparaître un service partagé avec d'autres fonctionnalités.
    """
    fonctionnalite = db.query(Fonctionnalite).filter(
        Fonctionnalite.id == fonctionnalite_id
    ).first()
    if not fonctionnalite:
        raise HTTPException(status_code=404, detail="Fonctionnalité non trouvée")

    avant = snapshot(fonctionnalite)
    db.delete(fonctionnalite)
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="fonctionnalite",
        entite_id=fonctionnalite_id, nom_entite=avant.get("titre", "?"),
        avant=avant,
    )
    return {"message": "Fonctionnalité supprimée"}


@router.post(
    "/{fonctionnalite_id}/services/{service_id}", response_model=FonctionnaliteResponse
)
def add_service(
    fonctionnalite_id: int,
    service_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    """Rattache un service existant à la fonctionnalité.

    On ne crée pas de service à la volée ici : le service est une entité
    technique réutilisée, il se gère depuis /api/services.
    """
    fonctionnalite = db.query(Fonctionnalite).filter(
        Fonctionnalite.id == fonctionnalite_id
    ).first()
    if not fonctionnalite:
        raise HTTPException(status_code=404, detail="Fonctionnalité non trouvée")

    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    deja = (
        db.query(FonctionnaliteService)
        .filter(
            FonctionnaliteService.fonctionnalite_id == fonctionnalite_id,
            FonctionnaliteService.service_id == service_id,
        )
        .first()
    )
    if deja:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce service est déjà rattaché à cette fonctionnalité",
        )

    db.add(FonctionnaliteService(fonctionnalite_id=fonctionnalite_id, service_id=service_id))
    enregistrer_historique(
        db, utilisateur=user, action="rattachement", type_entite="service",
        entite_id=service_id, nom_entite=service.nom,
        apres={"fonctionnalite_id": fonctionnalite_id, "service_id": service_id, "fonctionnalite_titre": fonctionnalite.titre},
    )
    return _serialiser(_charger_avec(db, fonctionnalite_id))


@router.delete(
    "/{fonctionnalite_id}/services/{service_id}", response_model=FonctionnaliteResponse
)
def remove_service(
    fonctionnalite_id: int,
    service_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    """Détache le service de la fonctionnalité, sans supprimer le service."""
    liaison = (
        db.query(FonctionnaliteService)
        .filter(
            FonctionnaliteService.fonctionnalite_id == fonctionnalite_id,
            FonctionnaliteService.service_id == service_id,
        )
        .first()
    )
    if not liaison:
        raise HTTPException(
            status_code=404, detail="Ce service n'est pas rattaché à cette fonctionnalité"
        )

    nom_service = liaison.service.nom if liaison.service else str(service_id)
    db.delete(liaison)
    enregistrer_historique(
        db, utilisateur=user, action="detachement", type_entite="service",
        entite_id=service_id, nom_entite=nom_service,
        apres={"fonctionnalite_id": fonctionnalite_id, "service_id": service_id},
    )
    return _serialiser(_charger_avec(db, fonctionnalite_id))
