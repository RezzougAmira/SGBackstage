from pydantic import BaseModel
from typing import Optional


class AttributCreate(BaseModel):
    nom: str
    type: str
    # Optionnel : le table_id fait foi (il vient du chemin de l'URL), mais le
    # champ reste accepté pour ne pas casser les formulaires existants.
    table_id: Optional[int] = None


class AttributResponse(BaseModel):
    id: int
    nom: str
    type: str
    table_id: int

    class Config:
        from_attributes = True
