from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ArchiveCreate(BaseModel):
    identifiant: str


class ArchiveResponse(BaseModel):
    id: int
    identifiant: str
    date_push: datetime

    class Config:
        from_attributes = True
