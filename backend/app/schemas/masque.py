from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MasqueCreate(BaseModel):
    code: str
    nom: str
    description: Optional[str] = None
    image_key: Optional[str] = None


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
