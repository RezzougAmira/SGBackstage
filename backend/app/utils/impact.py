"""Analyse d'impact avant suppression.

Le modèle est un graphe de tables de jointure : un masque peut être porté par
plusieurs étapes, un service appelé par plusieurs masques, une procédure par
plusieurs services. Supprimer un objet ne supprime donc pas que lui : cela
supprime aussi tous les liens qui pointent vers lui.

Avant toute suppression, ces fonctions répondent à une question :
  - qui d'autre utilise cet objet (à prévenir).
"""

from typing import List

from sqlalchemy.orm import Session

from ..models.etape import Etape
from ..models.masque import EtapeMasque, Masque
from ..models.procedure import ServiceProcedure
from ..models.service import MasqueService, Service


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
