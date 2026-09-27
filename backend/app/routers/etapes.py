from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.etape import Etape
from ..schemas.etape import (
    EtapeCreate,
    EtapeResponse,
    EtapeReorder,
    EtapeDetailResponse,
    MasqueRef,
    ServiceRef,
    ProcedureRef,
    TableRef,
)

router = APIRouter(prefix="/api/processes/{process_id}/etapes", tags=["etapes"])
etapes_standalone_router = APIRouter(prefix="/api", tags=["etapes"])


def _build_detail(etape: Etape) -> EtapeDetailResponse:
    data = EtapeDetailResponse(
        id=etape.id,
        nom=etape.nom,
        description=etape.description,
        ordre=etape.ordre,
        process_id=etape.process_id,
        created_at=etape.created_at,
        updated_at=etape.updated_at,
    )
    for em in etape.masques:
        masque = em.masque
        mref = MasqueRef(
            id=masque.id,
            code=masque.code,
            nom=masque.nom,
            description=masque.description,
            image_key=masque.image_key,
        )
        for ms in masque.services:
            svc = ms.service
            sref = ServiceRef(
                id=svc.id,
                nom=svc.nom,
                methode_http=svc.methode_http,
                url=svc.url,
                input_desc=svc.input_desc,
                output_desc=svc.output_desc,
            )
            for sp in svc.procedures:
                proc = sp.procedure
                sref.procedures.append(
                    ProcedureRef(
                        id=proc.id,
                        nom=proc.nom,
                        description=proc.description,
                        tables=[TableRef(id=t.table.id, nom=t.table.nom) for t in proc.tables],
                    )
                )
            mref.services.append(sref)
        data.masques.append(mref)
    return data


@router.get("/", response_model=List[EtapeResponse])
def list_etapes(process_id: int, db: Session = Depends(get_db)):
    etapes = db.query(Etape).filter(Etape.process_id == process_id).order_by(Etape.ordre).all()
    return [EtapeResponse.from_orm(e) for e in etapes]


@router.get("/{etape_id}", response_model=EtapeDetailResponse)
def get_etape(process_id: int, etape_id: int, db: Session = Depends(get_db)):
    etape = db.query(Etape).filter(
        Etape.id == etape_id,
        Etape.process_id == process_id
    ).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")
    return _build_detail(etape)


@router.post("/", response_model=EtapeResponse, status_code=201)
def create_etape(process_id: int, etape: EtapeCreate, db: Session = Depends(get_db)):
    db_etape = Etape(**etape.model_dump())
    db.add(db_etape)
    db.commit()
    db.refresh(db_etape)
    return db_etape


@router.put("/{etape_id}", response_model=EtapeResponse)
def update_etape(process_id: int, etape_id: int, etape: EtapeCreate, db: Session = Depends(get_db)):
    db_etape = db.query(Etape).filter(
        Etape.id == etape_id,
        Etape.process_id == process_id
    ).first()
    if not db_etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")

    for key, value in etape.model_dump(exclude_unset=True).items():
        setattr(db_etape, key, value)

    db.commit()
    db.refresh(db_etape)
    return db_etape


@router.delete("/{etape_id}", status_code=204)
def delete_etape(process_id: int, etape_id: int, db: Session = Depends(get_db)):
    db_etape = db.query(Etape).filter(
        Etape.id == etape_id,
        Etape.process_id == process_id
    ).first()
    if not db_etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")

    db.delete(db_etape)
    db.commit()


@router.put("/reorder")
def reorder_etapes(process_id: int, reorder: EtapeReorder, db: Session = Depends(get_db)):
    for index, etape_id in enumerate(reorder.etape_ids):
        etape = db.query(Etape).filter(
            Etape.id == etape_id,
            Etape.process_id == process_id
        ).first()
        if etape:
            etape.ordre = index + 1
    db.commit()
    return {"message": "Étapes réordonnées"}


@etapes_standalone_router.get("/etapes/{etape_id}", response_model=EtapeDetailResponse)
def get_etape_standalone(etape_id: int, db: Session = Depends(get_db)):
    etape = db.query(Etape).filter(Etape.id == etape_id).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")
    return _build_detail(etape)
