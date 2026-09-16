from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProcessCreate(BaseModel):
    nom: str
    description: Optional[str] = None
    diagramme_url: Optional[str] = None
    diagramme_type: Optional[str] = None
    domaine_id: int


class ProcessUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None
    diagramme_url: Optional[str] = None
    diagramme_type: Optional[str] = None
    domaine_id: Optional[int] = None


class ProcessResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    diagramme_url: Optional[str]
    diagramme_type: Optional[str]
    domaine_id: int
    created_at: datetime
    updated_at: datetime
    etape_count: Optional[int] = 0

    class Config:
        from_attributes = True
