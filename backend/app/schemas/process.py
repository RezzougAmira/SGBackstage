from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProcessCreate(BaseModel):
    nom: str
    description: Optional[str] = None
    domaine_id: int


class ProcessResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    domaine_id: int
    created_at: datetime
    updated_at: datetime
    etape_count: Optional[int] = 0

    class Config:
        from_attributes = True
