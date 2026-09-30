"""Analyse d'impact avant suppression.

Le modèle est un graphe de tables de jointure : un masque peut être porté par
plusieurs étapes, un service appelé par plusieurs masques, une procédure par
plusieurs services. Supprimer un objet ne supprime donc pas que lui : cela
supprime aussi tous les liens qui pointent vers lui, y compris dans des étapes
et des demandes de changement que l'utilisateur n'a pas sous les yeux.

Avant toute suppression, ces fonctions répondent à deux questions :
  - qui d'autre utilise cet objet (à prévenir) ;
  - quelle demande de changement en dépend (bloquant, car l'historique de
    traçabilité ne doit pas disparaître en silence).
"""

from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.dc import DC, DCMasque, DCProcedure, DCService
from ..models.etape import Etape
from ..models.masque import EtapeMasque, Masque
from ..models.procedure import ServiceProcedure
from ..models.service import MasqueService, Service


# ======================
# DEMANDES DE CHANGEMENT
# ======================
def dcs_de_etape(db: Session, etape_id: int) -> List[str]:
    return [
        d.numero
        for d in db.query(DC).filter(DC.etape_id == etape_id).order_by(DC.numero).all()
    ]


def dcs_de_masque(db: Session, masque_id: int) -> List[str]:
    numeros = (
        db.query(DC.numero)
        .join(DCMasque, DCMasque.dc_id == DC.id)
        .filter(DCMasque.masque_id == masque_id)
        .order_by(DC.numero)
        .all()
    )
    return [n for (n,) in numeros]


def dcs_de_service(db: Session, service_id: int) -> List[str]:
    numeros = (
        db.query(DC.numero)
        .join(DCService, DCService.dc_id == DC.id)
        .filter(DCService.service_id == service_id)
        .order_by(DC.numero)
        .all()
    )
    return [n for (n,) in numeros]


def dcs_de_procedure(db: Session, procedure_id: int) -> List[str]:
    numeros = (
        db.query(DC.numero)
        .join(DCProcedure, DCProcedure.dc_id == DC.id)
        .filter(DCProcedure.procedure_id == procedure_id)
        .order_by(DC.numero)
        .all()
    )
    return [n for (n,) in numeros]


def refuser_si_reference_dc(dcs: List[str], type_objet: str) -> None:
    """Bloque la suppression si une demande de changement depend de l'objet.

    Exiger une décision explicite vaut mieux que laisser une cascade
    supprimer silencieusement l'historique de traçabilité.
    """
    if not dcs:
        return
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            f"Suppression impossible : {type_objet} est référencé par "
            f"{len(dcs)} demande(s) de changement ({', '.join(dcs)}). "
            "Supprimez ou archivez ces demandes d'abord, ou retirez l'objet "
            "de leur périmètre."
        ),
    )


# ======================
# UTILISATEURS PARTAGES
# ======================
def etapes_du_masque(db: Session, masque_id: int) -> List[Etape]:
    return (
        db.query(Etape)
        .join(EtapeMasque, EtapeMasque.etape_id == Etape.id)
        .filter(EtapeMasque.masque_id == masque_id)
        .order_by(Etape.ordre)
        .all()
    )


def masques_du_service(db: Session, service_id: int) -> List[Masque]:
    return (
        db.query(Masque)
        .join(MasqueService, MasqueService.masque_id == Masque.id)
        .filter(MasqueService.service_id == service_id)
        .order_by(Masque.code)
        .all()
    )


def services_de_la_procedure(
    db: Session, procedure_id: int, exclude_service_id: int = None
) -> List[Service]:
    """Les services qui appellent cette procédure.

    `exclude_service_id` permet de ne compter que les *autres* services : lors
    de la suppression d'un masque, le service que l'on efface ne doit pas
    empêcher l'effacement de ses propres procédures.
    """
    query = (
        db.query(Service)
        .join(ServiceProcedure, ServiceProcedure.service_id == Service.id)
        .filter(ServiceProcedure.procedure_id == procedure_id)
    )
    if exclude_service_id is not None:
        query = query.filter(Service.id != exclude_service_id)
    return query.order_by(Service.nom).all()


def libelle_etape(etape: Etape) -> str:
    processus = etape.process.nom if etape.process else "?"
    return f"{etape.nom} ({processus}, étape {etape.ordre})"


# ======================
# COMPTAGES DE DEPENDANCES
# ======================
def compter_procedures(db: Session, service_ids: List[int]) -> int:
    if not service_ids:
        return 0
    return (
        db.query(ServiceProcedure)
        .filter(ServiceProcedure.service_id.in_(service_ids))
        .count()
    )
