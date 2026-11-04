from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import re
from ..database import get_db
from ..models.etape import Etape
from ..models.masque import EtapeMasque, Masque
from ..models.service import MasqueService, Service
from ..models.procedure import ProcedureStockee, ServiceProcedure
from ..models.user import User
from ..utils import impact
from ..utils.deps import get_current_user, require_deleter, require_writer
from ..utils.historique import enregistrer_historique, snapshot
from ..schemas.masque import (
    MasqueCreate,
    MasqueEtapeCreate,
    MasqueResponse,
    MasqueImpact,
    MasqueServiceImpact,
    MasqueSuppressionResult,
    SuppressionRapport,
)
from ..schemas.common import PageParams, PaginatedResponse

router = APIRouter(prefix="/api/masques", tags=["masques"])
etape_masques_router = APIRouter(prefix="/api", tags=["masques"])

CODE_LENGTH = 6
CODE_PATTERN = re.compile(r"^[A-Z0-9]{6}$")


def _validate_code(code: str) -> None:
    """Le code est une référence courte et stable : 6 caractères alphanumériques."""
    code = (code or "").strip().upper()
    if not CODE_PATTERN.match(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Le code du masque doit comporter exactement {CODE_LENGTH} caractères "
                "lettres ou chiffres (ex : CE2100)."
            ),
        )


def _serialiser(masque: Masque, db: Session) -> MasqueResponse:
    """Convertit un masque en réponse API, en incluant ses rattachements :
    étapes qui le portent, services appelés, fonctionnalités offertes."""
    return MasqueResponse(
        id=masque.id,
        code=masque.code,
        nom=masque.nom,
        description=masque.description,
        image_key=masque.image_key,
        created_at=masque.created_at,
        updated_at=masque.updated_at,
        etapes=[
            {"id": e.id, "nom": impact.libelle_etape(e)}
            for e in impact.etapes_du_masque(db, masque.id)
        ],
        services=[
            {"id": lien.service.id, "nom": lien.service.nom}
            for lien in masque.services
            if lien.service
        ],
        fonctionnalites=[
            {"id": f.id, "nom": f.titre}
            for f in masque.fonctionnalites
        ],
    )


@router.get("/", response_model=PaginatedResponse[MasqueResponse])
def list_masques(
    search: Optional[str] = Query(None, max_length=100),
    pagination: PageParams = Depends(),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste paginée des masques."""
    query = db.query(Masque)
    if search:
        query = query.filter(Masque.code.ilike(f"%{search}%"))

    total = query.count()
    items = (
        query.order_by(Masque.code)
        .offset((pagination.page - 1) * pagination.page_size)
        .limit(pagination.page_size)
        .all()
    )
    return PaginatedResponse.create([_serialiser(m, db) for m in items], total, pagination)


@router.get("/{masque_id}", response_model=MasqueResponse)
def get_masque(masque_id: int, db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")
    return _serialiser(masque, db)


@router.post("/", response_model=MasqueResponse, status_code=201)
def create_masque(
    masque: MasqueCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    _validate_code(masque.code)

    existing = db.query(Masque).filter(Masque.code == masque.code.strip().upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un masque avec ce code existe déjà"
        )

    db_masque = Masque(**{**masque.model_dump(), "code": masque.code.strip().upper()})
    db.add(db_masque)
    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_masque)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="masque",
        entite_id=db_masque.id, nom_entite=f"{db_masque.code} — {db_masque.nom}",
        apres=snapshot(db_masque),
    )
    return _serialiser(db_masque, db)


@router.put("/{masque_id}", response_model=MasqueResponse)
def update_masque(
    masque_id: int,
    masque: MasqueCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    db_masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not db_masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")

    avant = snapshot(db_masque)
    for key, value in masque.model_dump(exclude_unset=True).items():
        setattr(db_masque, key, value)

    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_masque)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="masque",
        entite_id=db_masque.id, nom_entite=f"{db_masque.code} — {db_masque.nom}",
        avant=avant, apres=snapshot(db_masque),
    )
    return _serialiser(db_masque, db)


@router.get("/{masque_id}/impact", response_model=MasqueImpact)
def get_masque_impact(masque_id: int, db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Où le masque est utilisé, pour dimensionner la suppression."""
    db_masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not db_masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")

    services = []
    for ms in db_masque.services:
        svc = ms.service
        if not svc:
            continue
        autres = [m for m in impact.masques_du_service(db, svc.id) if m.id != db_masque.id]
        procedures = [sp.procedure for sp in svc.procedures if sp.procedure]
        services.append(
            MasqueServiceImpact(
                id=svc.id,
                nom=svc.nom,
                masque_count=len(impact.masques_du_service(db, svc.id)),
                autres_masques=[f"{m.code} — {m.nom}" for m in autres],
                procedures=[f"{p.nom} ({p.id})" for p in procedures],
            )
        )

    return MasqueImpact(
        etapes=[
            impact.libelle_etape(e)
            for e in impact.etapes_du_masque(db, db_masque.id)
        ],
        services=services,
    )


@router.delete("/{masque_id}", response_model=MasqueSuppressionResult)
def delete_masque(
    masque_id: int,
    supprimer_services: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_deleter),
):
    """Supprime un masque, et ses services seulement si l'utilisateur le demande.

    Les liens avec les étapes disparaissent dans tous les cas : le masque
    disparaît de la fiche. Restent à distinguer deux intentions :
      - par défaut, les services et procédures sont conservés (un service peut
        être appelé par plusieurs masques) ;
      - sur demande explicite, ils sont effacés, mais uniquement s'ils ne
        servent qu'ici.
    """
    db_masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not db_masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")

    # Relevé avant suppression : les liens masque→service partent avec le masque.
    services = [ms.service for ms in db_masque.services if ms.service]
    services_avant = {id(s): snapshot(s) for s in services}
    supprimes: List[str] = []
    conserves: List[str] = []
    supprimes_services: List[dict] = []
    supprimes_procedures: List[dict] = []

    db.delete(db_masque)
    db.flush()

    if supprimer_services:
        for service in services:
            autres = [
                m for m in impact.masques_du_service(db, service.id)
            ]
            if autres:
                conserves.append(
                    f"{service.nom} — encore appelé par "
                    f"{len(autres)} autre(s) masque(s)"
                )
                continue

            # Service orphelin : on emporte ses procédures, puis ses tables.
            for sp in list(service.procedures):
                procedure = sp.procedure
                if not procedure:
                    continue
                ailleurs = impact.services_de_la_procedure(
                    db, procedure.id, exclude_service_id=service.id
                )
                if ailleurs:
                    conserves.append(
                        f"{procedure.nom} — utilisé ailleurs"
                    )
                    continue
                db.delete(procedure)
                supprimes_procedures.append(
                    {"id": procedure.id, "avant": snapshot(procedure)}
                )
                supprimes.append(f"{procedure.nom} (procédure stockée)")

            db.delete(service)
            supprimes_services.append(
                {"id": service.id, "avant": services_avant.get(id(service))}
            )
            supprimes.append(f"{service.nom} (service)")

    db.commit()

    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="masque",
        entite_id=masque_id, nom_entite=f"{db_masque.code} — {db_masque.nom}",
        avant=snapshot(db_masque),
    )
    for item in supprimes_services:
        avant = item["avant"] or {}
        enregistrer_historique(
            db, utilisateur=user, action="suppression", type_entite="service",
            entite_id=item["id"], nom_entite=avant.get("nom", "service"),
            avant=avant,
        )
    for item in supprimes_procedures:
        avant = item["avant"] or {}
        enregistrer_historique(
            db, utilisateur=user, action="suppression", type_entite="procedure",
            entite_id=item["id"], nom_entite=avant.get("nom", "procédure"),
            avant=avant,
        )

    return MasqueSuppressionResult(
        masque=SuppressionRapport(
            nom=f"{db_masque.code} — {db_masque.nom}", supprimes=[db_masque.code]
        ),
        services=SuppressionRapport(
            nom="Services et procédures", supprimes=supprimes, conserves=conserves
        ),
    )


@etape_masques_router.post(
    "/etapes/{etape_id}/masques", response_model=MasqueResponse, status_code=201
)
def create_masque_pour_etape(
    etape_id: int,
    masque: MasqueEtapeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    """Crée un masque et le rattache à l'étape, service appelé compris.

    Le rattachement se fait dans la même transaction : un masque créé depuis
    une étape ne peut pas exister sans y être lié.
    """
    etape = db.query(Etape).filter(Etape.id == etape_id).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")

    _validate_code(masque.code)

    existing = db.query(Masque).filter(Masque.code == masque.code.strip().upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un masque avec ce code existe déjà",
        )

    payload = masque.model_dump(exclude={"service"})
    payload["code"] = payload["code"].strip().upper()
    db_masque = Masque(**payload)
    db.add(db_masque)
    db.flush()

    db.add(EtapeMasque(etape_id=etape_id, masque_id=db_masque.id))

    db_service = None
    if masque.service:
        db_service = Service(**masque.service.model_dump())
        db.add(db_service)
        db.flush()
        db.add(MasqueService(masque_id=db_masque.id, service_id=db_service.id))

    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_masque)

    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="masque",
        entite_id=db_masque.id, nom_entite=f"{db_masque.code} — {db_masque.nom}",
        apres=snapshot(db_masque),
    )
    enregistrer_historique(
        db, utilisateur=user, action="rattachement", type_entite="masque",
        entite_id=db_masque.id, nom_entite=f"{db_masque.code} — {db_masque.nom}",
        apres={"etape_id": etape_id, "masque_id": db_masque.id, "etape_nom": etape.nom},
    )
    if db_service is not None:
        enregistrer_historique(
            db, utilisateur=user, action="creation", type_entite="service",
            entite_id=db_service.id, nom_entite=db_service.nom,
            apres=snapshot(db_service),
        )
        enregistrer_historique(
            db, utilisateur=user, action="rattachement", type_entite="service",
            entite_id=db_service.id, nom_entite=db_service.nom,
            apres={"masque_id": db_masque.id, "service_id": db_service.id},
        )
    return _serialiser(db_masque, db)
