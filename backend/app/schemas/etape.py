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


class TableRef(BaseModel):
    id: int
    nom: str


class ProcedureRef(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    tables: List[TableRef] = []


class ServiceRef(BaseModel):
    id: int
    nom: str
    methode_http: Optional[str]
    url: Optional[str]
    input_desc: Optional[str]
    output_desc: Optional[str]
    procedures: List[ProcedureRef] = []


class MasqueRef(BaseModel):
    id: int
    code: str
    nom: str
    description: Optional[str]
    image_key: Optional[str] = None
    services: List[ServiceRef] = []


class EtapeDetailResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    ordre: int
    process_id: int
    created_at: datetime
    updated_at: datetime
    masques: List[MasqueRef] = []
