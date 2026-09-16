from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.table import TableInfo
from ..schemas.table import TableCreate, TableResponse

router = APIRouter(prefix="/api/tables", tags=["tables"])


@router.get("/", response_model=List[TableResponse])
def list_tables(db: Session = Depends(get_db)):
    tables = db.query(TableInfo).all()
    result = []
    for table in tables:
        table_dict = TableResponse.from_orm(table)
        table_dict.attribut_count = len(table.attributs)
        result.append(table_dict)
    return result


@router.get("/{table_id}", response_model=TableResponse)
def get_table(table_id: int, db: Session = Depends(get_db)):
    table = db.query(TableInfo).filter(TableInfo.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    table_dict = TableResponse.from_orm(table)
    table_dict.attribut_count = len(table.attributs)
    return table_dict


@router.post("/", response_model=TableResponse, status_code=201)
def create_table(table: TableCreate, db: Session = Depends(get_db)):
    existing = db.query(TableInfo).filter(
        TableInfo.nom == table.nom,
        TableInfo.base_donnees == table.base_donnees
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette table existe déjà"
        )

    db_table = TableInfo(**table.model_dump())
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table


@router.put("/{table_id}", response_model=TableResponse)
def update_table(table_id: int, table: TableCreate, db: Session = Depends(get_db)):
    db_table = db.query(TableInfo).filter(TableInfo.id == table_id).first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table non trouvée")

    for key, value in table.model_dump(exclude_unset=True).items():
        setattr(db_table, key, value)

    db.commit()
    db.refresh(db_table)
    return db_table


@router.delete("/{table_id}", status_code=204)
def delete_table(table_id: int, db: Session = Depends(get_db)):
    db_table = db.query(TableInfo).filter(TableInfo.id == table_id).first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table non trouvée")

    db.delete(db_table)
    db.commit()
