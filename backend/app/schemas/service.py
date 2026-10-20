from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ServiceCreate(BaseModel):
    nom: str
    methode_http: Optional[str] = None
    url: Optional[str] = None
    input_desc: Optional[str] = None
    output_desc: Optional[str] = None
    controleur: Optional[str] = None
    collection: Optional[dict] = None


class ServiceLienRef(BaseModel):
    """Élément rattaché à un service (procédure, masque ou fonctionnalité)."""
    id: int
    nom: str


class ServiceResponse(BaseModel):
    id: int
    nom: str
    methode_http: Optional[str]
    url: Optional[str]
    input_desc: Optional[str]
    output_desc: Optional[str]
    controleur: Optional[str]
    collection: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    # Rattachements : la page affiche un badge « N procédures » dans le tableau
    # et « Où le service est utilisé » (masques + fonctionnalités) dans le détail.
    procedures: List[ServiceLienRef] = []
    masques: List[ServiceLienRef] = []
    fonctionnalites: List[ServiceLienRef] = []

    class Config:
        from_attributes = True
