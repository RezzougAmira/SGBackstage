from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.dc import DC, DCMasque, DCService, DCProcedure, DCTable, DCAttribut
from ..schemas.dc import DCCreate, DCResponse

router = APIRouter(prefix="/api/dcs", tags=["dcs"])


@router.get("/", response_model=List[DCResponse])
def list_dcs(db: Session = Depends(get_db)):
    dcs = db.query(DC).order_by(DC.date.desc()).all()
    return [DCResponse.from_orm(dc) for dc in dcs]


@router.get("/{dc_id}")
def get_dc(dc_id: int, db: Session = Depends(get_db)):
    dc = db.query(DC).filter(DC.id == dc_id).first()
    if not dc:
        raise HTTPException(status_code=404, detail="DC non trouvée")

    # Construire la réponse avec les impacts
    return {
        "id": dc.id,
        "numero": dc.numero,
        "titre": dc.titre,
        "description": dc.description,
        "date": dc.date,
        "auteur_id": dc.auteur_id,
        "etape_id": dc.etape_id,
        "archive_id": dc.archive_id,
        "created_at": dc.created_at,
        "updated_at": dc.updated_at,
        "masques": [
            {
                "masque_id": m.masque_id,
                "code": m.masque.code if m.masque else None,
                "nom": m.masque.nom if m.masque else None,
                "action": m.action,
                "details": m.details
            }
            for m in dc.masques
        ],
        "services": [
            {
                "service_id": s.service_id,
                "nom": s.service.nom if s.service else None,
                "action": s.action,
                "details": s.details
            }
            for s in dc.services
        ],
        "procedures": [
            {
                "procedure_id": p.procedure_id,
                "nom": p.procedure.nom if p.procedure else None,
                "action": p.action,
                "details": p.details
            }
            for p in dc.procedures
        ],
        "tables": [
            {
                "table_id": t.table_id,
                "nom": t.table.nom if t.table else None,
                "action": t.action,
                "details": t.details
            }
            for t in dc.tables
        ],
        "attributs": [
            {
                "attribut_id": a.attribut_id,
                "nom": a.attribut.nom if a.attribut else None,
                "action": a.action,
                "details": a.details
            }
            for a in dc.attributs
        ]
    }


@router.post("/", response_model=DCResponse, status_code=201)
def create_dc(dc: DCCreate, db: Session = Depends(get_db)):
    # Vérifier l'unicité du numéro
    existing = db.query(DC).filter(DC.numero == dc.numero).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une DC avec ce numéro existe déjà"
        )

    # Créer la DC
    db_dc = DC(
        numero=dc.numero,
        titre=dc.titre,
        description=dc.description,
        auteur_id=dc.auteur_id,
        etape_id=dc.etape_id,
        archive_id=dc.archive_id
    )
    db.add(db_dc)
    db.commit()
    db.refresh(db_dc)

    # Ajouter les masques impactés
    for masque_data in dc.masques:
        db_masque = DCMasque(
            dc_id=db_dc.id,
            masque_id=masque_data.masque_id,
            action=masque_data.action,
            details=masque_data.details
        )
        db.add(db_masque)

    # Ajouter les services impactés
    for service_data in dc.services:
        db_service = DCService(
            dc_id=db_dc.id,
            service_id=service_data.service_id,
            action=service_data.action,
            details=service_data.details
        )
        db.add(db_service)

    # Ajouter les procédures impactées
    for procedure_data in dc.procedures:
        db_procedure = DCProcedure(
            dc_id=db_dc.id,
            procedure_id=procedure_data.procedure_id,
            action=procedure_data.action,
            details=procedure_data.details
        )
        db.add(db_procedure)

    # Ajouter les tables impactées
    for table_data in dc.tables:
        db_table = DCTable(
            dc_id=db_dc.id,
            table_id=table_data.table_id,
            action=table_data.action,
            details=table_data.details
        )
        db.add(db_table)

    # Ajouter les attributs impactés
    for attribut_data in dc.attributs:
        db_attribut = DCAttribut(
            dc_id=db_dc.id,
            attribut_id=attribut_data.attribut_id,
            action=attribut_data.action,
            details=attribut_data.details
        )
        db.add(db_attribut)

    db.commit()
    db.refresh(db_dc)
    return db_dc


@router.put("/{dc_id}", response_model=DCResponse)
def update_dc(dc_id: int, dc: DCCreate, db: Session = Depends(get_db)):
    db_dc = db.query(DC).filter(DC.id == dc_id).first()
    if not db_dc:
        raise HTTPException(status_code=404, detail="DC non trouvée")

    # Mettre à jour les champs principaux
    db_dc.numero = dc.numero
    db_dc.titre = dc.titre
    db_dc.description = dc.description
    db_dc.etape_id = dc.etape_id
    db_dc.archive_id = dc.archive_id

    # Supprimer les anciennes liaisons
    db.query(DCMasque).filter(DCMasque.dc_id == dc_id).delete()
    db.query(DCService).filter(DCService.dc_id == dc_id).delete()
    db.query(DCProcedure).filter(DCProcedure.dc_id == dc_id).delete()
    db.query(DCTable).filter(DCTable.dc_id == dc_id).delete()
    db.query(DCAttribut).filter(DCAttribut.dc_id == dc_id).delete()

    # Ajouter les nouvelles liaisons
    for masque_data in dc.masques:
        db_masque = DCMasque(
            dc_id=db_dc.id,
            masque_id=masque_data.masque_id,
            action=masque_data.action,
            details=masque_data.details
        )
        db.add(db_masque)

    for service_data in dc.services:
        db_service = DCService(
            dc_id=db_dc.id,
            service_id=service_data.service_id,
            action=service_data.action,
            details=service_data.details
        )
        db.add(db_service)

    for procedure_data in dc.procedures:
        db_procedure = DCProcedure(
            dc_id=db_dc.id,
            procedure_id=procedure_data.procedure_id,
            action=procedure_data.action,
            details=procedure_data.details
        )
        db.add(db_procedure)

    for table_data in dc.tables:
        db_table = DCTable(
            dc_id=db_dc.id,
            table_id=table_data.table_id,
            action=table_data.action,
            details=table_data.details
        )
        db.add(db_table)

    for attribut_data in dc.attributs:
        db_attribut = DCAttribut(
            dc_id=db_dc.id,
            attribut_id=attribut_data.attribut_id,
            action=attribut_data.action,
            details=attribut_data.details
        )
        db.add(db_attribut)

    db.commit()
    db.refresh(db_dc)
    return db_dc


@router.delete("/{dc_id}", status_code=204)
def delete_dc(dc_id: int, db: Session = Depends(get_db)):
    db_dc = db.query(DC).filter(DC.id == dc_id).first()
    if not db_dc:
        raise HTTPException(status_code=404, detail="DC non trouvée")

    db.delete(db_dc)
    db.commit()
