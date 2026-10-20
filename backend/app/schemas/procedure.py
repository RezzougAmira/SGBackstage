from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProcedureCreate(BaseModel):
    nom: str
    description: Optional[str] = None


class ProcedureLienRef(BaseModel):
    """Élément rattaché à une procédure (service, fonctionnalité ou table)."""
    id: int
    nom: str


class ProcedureResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Éléments qui utilisent la procédure (ou qu'elle touche) : c'est l'information
    # la plus utile de la page (le sous-titre parle d'opérations « invoquées par
    # les services »), elle n'était pas exposée par l'API.
    services: List[ProcedureLienRef] = []
    tables: List[ProcedureLienRef] = []

    class Config:
        from_attributes = True
