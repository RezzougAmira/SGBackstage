from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ServiceCreate(BaseModel):
    nom: str
    methode_http: Optional[str] = None
    url: Optional[str] = None
    input_desc: Optional[str] = None
    output_desc: Optional[str] = None
    controleur: Optional[str] = None
    modifie_bdd: Optional[bool] = False


class ServiceResponse(BaseModel):
    id: int
    nom: str
    methode_http: Optional[str]
    url: Optional[str]
    input_desc: Optional[str]
    output_desc: Optional[str]
    controleur: Optional[str]
    modifie_bdd: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
