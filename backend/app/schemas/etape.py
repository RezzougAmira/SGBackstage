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
