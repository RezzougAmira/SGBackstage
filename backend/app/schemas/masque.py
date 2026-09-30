from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MasqueCreate(BaseModel):
    code: str
    nom: str
    description: Optional[str] = None
    image_key: Optional[str] = None


class ServiceInfo(BaseModel):
    nom: str
    methode_http: Optional[str] = None
    url: Optional[str] = None
    input_desc: Optional[str] = None
    output_desc: Optional[str] = None


class MasqueEtapeCreate(MasqueCreate):
    """Masque créé directement depuis une étape, service appelé en option."""

    service: Optional[ServiceInfo] = None


class MasqueResponse(BaseModel):
    id: int
    code: str
    nom: str
    description: Optional[str]
    image_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ======================
# IMPACT DE SUPPRESSION
# ======================
class MasqueServiceImpact(BaseModel):
    """Un service appelé par le masque, et ce qui se passe si on le supprime."""

    id: int
    nom: str
    # Nombre de masques, celui-ci compris, qui appellent ce service.
    masque_count: int
    autres_masques: List[str] = []
    dcs: List[str] = []
    procedures: List[str] = []


class MasqueImpact(BaseModel):
    """Où le masque est utilisé, pour dimensionner la suppression."""

    dcs: List[str] = []
    etapes: List[str] = []
    services: List[MasqueServiceImpact] = []


class SuppressionRapport(BaseModel):
    """Ce qui a réellement été supprimé, et ce qui a été conservé."""

    nom: str
    supprimes: List[str] = []
    conserves: List[str] = []


class MasqueSuppressionResult(BaseModel):
    masque: SuppressionRapport
    services: SuppressionRapport


class MasqueDetachResult(BaseModel):
    message: str
