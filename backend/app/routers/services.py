from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.service import Service, MasqueService
from ..models.masque import Masque
from ..models.procedure import ProcedureStockee, ServiceProcedure
from ..schemas.service import ServiceCreate, ServiceResponse
from ..schemas.procedure import ProcedureCreate, ProcedureResponse
from ..utils import impact

router = APIRouter(prefix="/api/services", tags=["services"])


def _procedures_du_service(db: Session, service_id: int) -> List[ProcedureStockee]:
    return [
        liaison.procedure
        for liaison in (
            db.query(ServiceProcedure)
            .filter(ServiceProcedure.service_id == service_id)
            .all()
        )
        if liaison.procedure is not None
    ]


@router.get("/{service_id}/procedures", response_model=List[ProcedureResponse])
def list_procedures_du_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    return _procedures_du_service(db, service_id)


@router.post(
    "/{service_id}/procedures", response_model=ProcedureResponse, status_code=201
)
def creer_et_attacher_procedure(
    service_id: int, payload: ProcedureCreate, db: Session = Depends(get_db)
):
    """Crée une procédure stockée et la rattache au service."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    nom = (payload.nom or "").strip()
    if not nom:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le nom ne peut pas être vide",
        )

    procedure = ProcedureStockee(**{**payload.model_dump(), "nom": nom})
    db.add(procedure)
    db.flush()
    db.add(ServiceProcedure(service_id=service_id, procedure_id=procedure.id))
    db.commit()
    db.refresh(procedure)
    return procedure


@router.post(
    "/{service_id}/procedures/{procedure_id}", response_model=ProcedureResponse
)
def attacher_procedure(service_id: int, procedure_id: int, db: Session = Depends(get_db)):
    """Rattache une procédure stockée existante au service."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    procedure = (
        db.query(ProcedureStockee).filter(ProcedureStockee.id == procedure_id).first()
    )
    if not procedure:
        raise HTTPException(status_code=404, detail="Procédure non trouvée")

    deja = (
        db.query(ServiceProcedure)
        .filter(
            ServiceProcedure.service_id == service_id,
            ServiceProcedure.procedure_id == procedure_id,
        )
        .first()
    )
    if deja:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette procédure est déjà rattachée à ce service",
        )

    db.add(ServiceProcedure(service_id=service_id, procedure_id=procedure_id))
    db.commit()
    return procedure


@router.delete("/{service_id}/procedures/{procedure_id}", status_code=204)
def detacher_procedure(service_id: int, procedure_id: int, db: Session = Depends(get_db)):
    """Détache la procédure du service, sans la supprimer."""
    liaison = (
        db.query(ServiceProcedure)
        .filter(
            ServiceProcedure.service_id == service_id,
            ServiceProcedure.procedure_id == procedure_id,
        )
        .first()
    )
    if not liaison:
        raise HTTPException(
            status_code=404, detail="Cette procédure n'est pas rattachée à ce service"
        )

    db.delete(liaison)
    db.commit()


@router.get("/", response_model=List[ServiceResponse])
def list_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return [ServiceResponse.from_orm(s) for s in services]


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    return ServiceResponse.from_orm(service)


@router.post("/", response_model=ServiceResponse, status_code=201)
def create_service(service: ServiceCreate, db: Session = Depends(get_db)):
    db_service = Service(**service.model_dump())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(service_id: int, service: ServiceCreate, db: Session = Depends(get_db)):
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    for key, value in service.model_dump(exclude_unset=True).items():
        setattr(db_service, key, value)

    db.commit()
    db.refresh(db_service)
    return db_service


@router.post("/{service_id}/assign-masque/{masque_id}", response_model=ServiceResponse)
def assign_service_to_masque(service_id: int, masque_id: int, db: Session = Depends(get_db)):
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    db_masque = db.query(Masque).filter(Masque.id == masque_id).first()
    if not db_masque:
        raise HTTPException(status_code=404, detail="Masque non trouvé")

    existing = db.query(MasqueService).filter(
        MasqueService.masque_id == masque_id,
        MasqueService.service_id == service_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Service déjà associé à ce masque")

    db.add(MasqueService(masque_id=masque_id, service_id=service_id))
    db.commit()
    return db_service


@router.delete("/{service_id}", status_code=204)
def delete_service(service_id: int, db: Session = Depends(get_db)):
    """Supprime le service de la base, avec tous ses liens.

    Refusé si une demande de changement le cite : la cascade supprimerait
    silencieusement l'historique de traçabilité.
    """
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service non trouvé")

    impact.refuser_si_reference_dc(
        impact.dcs_de_service(db, service_id), "ce service"
    )

    db.delete(db_service)
    db.commit()
