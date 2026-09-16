from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MasqueCreate(BaseModel):
    code: str
    nom: str
    description: Optional[str] = None


class MasqueResponse(BaseModel):
    id: int
    code: str
    nom: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
