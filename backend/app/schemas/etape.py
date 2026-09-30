from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class EtapeCreate(BaseModel):
    nom: str
    description: Optional[str] = None
    ordre: int
    process_id: int


class EtapeResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    ordre: int
    process_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EtapeReorder(BaseModel):
    etape_ids: List[int]


class TableRef(BaseModel):
    id: int
    nom: str


class ProcedureRef(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    tables: List[TableRef] = []


class ServiceRef(BaseModel):
    id: int
    nom: str
    methode_http: Optional[str]
    url: Optional[str]
    input_desc: Optional[str]
    output_desc: Optional[str]
    procedures: List[ProcedureRef] = []


class FonctionRef(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    services: List[ServiceRef] = []


class MasqueRef(BaseModel):
    id: int
    code: str
    nom: str
    description: Optional[str]
    image_key: Optional[str] = None
    fonctions: List[FonctionRef] = []


class EtapeDetailResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    ordre: int
    process_id: int
    process_nom: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    masques: List[MasqueRef] = []


# ======================
# IMPACT DE SUPPRESSION
# ======================
class EtapeMasqueImpact(BaseModel):
    """Un masque porté par l'étape, et ce qui se passe si on le supprime."""

    id: int
    code: str
    nom: str
    # Nombre d'étapes, celle-ci comprise, qui utilisent ce masque.
    etape_count: int
    # Détail des autres étapes, pour que l'utilisateur voie ce qu'il perd.
    autres_etapes: List[str] = []
    # Un masque cité par une demande de changement ne peut pas être effacé.
    dcs: List[str] = []
    fonctions_count: int = 0
    services_count: int = 0
    procedures_count: int = 0


class EtapeImpact(BaseModel):
    dcs: List[str] = []
    masques: List[EtapeMasqueImpact] = []


class SuppressionRapport(BaseModel):
    """Ce qui a réellement été supprimé, et ce qui a été conservé."""

    nom: str
    supprimes: List[str] = []
    conserves: List[str] = []


class EtapeSuppressionResult(BaseModel):
    etape: SuppressionRapport
    masques: SuppressionRapport


class EtapeDetachMasqueResult(BaseModel):
    message: str
