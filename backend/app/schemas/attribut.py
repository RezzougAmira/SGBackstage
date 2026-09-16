from pydantic import BaseModel
from typing import Optional


class AttributCreate(BaseModel):
    nom: str
    type: str
    table_id: int


class AttributResponse(BaseModel):
    id: int
    nom: str
    type: str
    table_id: int

    class Config:
        from_attributes = True
