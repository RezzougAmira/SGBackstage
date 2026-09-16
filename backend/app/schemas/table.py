from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TableCreate(BaseModel):
    nom: str
    base_donnees: Optional[str] = None
    description: Optional[str] = None


class TableResponse(BaseModel):
    id: int
    nom: str
    base_donnees: Optional[str]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    attribut_count: Optional[int] = 0

    class Config:
        from_attributes = True
