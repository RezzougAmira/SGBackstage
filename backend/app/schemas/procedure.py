from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProcedureCreate(BaseModel):
    nom: str
    description: Optional[str] = None


class ProcedureResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
