from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TableRef(BaseModel):
    id: int
    nom: str

    class Config:
        from_attributes = True


class ProcedureRef(BaseModel):
    id: int
    nom: str
    description: Optional[str] = None
    tables: List[TableRef] = []

    class Config:
        from_attributes = True


class ServiceRef(BaseModel):
    """Service appelé par une fonctionnalité, avec ses procédures stockées."""

    id: int
    nom: str
    methode_http: Optional[str] = None
    url: Optional[str] = None
    input_desc: Optional[str] = None
    output_desc: Optional[str] = None
    controleur: Optional[str] = None
    modifie_bdd: Optional[bool] = None
    procedures: List[ProcedureRef] = []

    class Config:
        from_attributes = True


class FonctionnaliteCreate(BaseModel):
    titre: str
    description: Optional[str] = None
    ordre: Optional[int] = None


class FonctionnaliteUpdate(BaseModel):
    """Mise à jour partielle : `model_dump(exclude_unset=True)` permet de
    distinguer « champ non fourni » de « champ vidé »."""

    titre: Optional[str] = None
    description: Optional[str] = None
    ordre: Optional[int] = None


class FonctionnaliteResponse(BaseModel):
    id: int
    titre: str
    description: Optional[str] = None
    masque_id: int
    ordre: int
    services: List[ServiceRef] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
