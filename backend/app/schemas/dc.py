from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DCMasqueCreate(BaseModel):
    masque_id: int
    action: str
    details: Optional[str] = None


class DCServiceCreate(BaseModel):
    service_id: int
    action: str
    details: Optional[str] = None


class DCProcedureCreate(BaseModel):
    procedure_id: int
    action: str
    details: Optional[str] = None


class DCTableCreate(BaseModel):
    table_id: int
    action: str
    details: Optional[str] = None


class DCAttributCreate(BaseModel):
    attribut_id: int
    action: str
    details: Optional[str] = None


class DCCreate(BaseModel):
    numero: str
    titre: str
    description: Optional[str] = None
    auteur_id: Optional[int] = None
    etape_id: Optional[int] = None
    archive_id: Optional[int] = None
    masques: Optional[List[DCMasqueCreate]] = []
    services: Optional[List[DCServiceCreate]] = []
    procedures: Optional[List[DCProcedureCreate]] = []
    tables: Optional[List[DCTableCreate]] = []
    attributs: Optional[List[DCAttributCreate]] = []


class DCResponse(BaseModel):
    id: int
    numero: str
    titre: str
    description: Optional[str]
    date: datetime
    auteur_id: Optional[int]
    etape_id: Optional[int]
    archive_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
