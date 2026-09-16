from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DomaineCreate(BaseModel):
    nom: str
    description: Optional[str] = None


class DomaineResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    process_count: Optional[int] = 0

    class Config:
        from_attributes = True
