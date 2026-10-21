from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.table import TableInfo
from ..models.user import User
from ..schemas.table import TableCreate, TableResponse
from ..utils.deps import get_current_user, require_deleter, require_writer
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/tables", tags=["tables"])


@router.get("/", response_model=List[TableResponse])
def list_tables(db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    tables = db.query(TableInfo).all()
    result = []
    for table in tables:
        table_dict = TableResponse.from_orm(table)
        table_dict.attribut_count = len(table.attributs)
        result.append(table_dict)
    return result


@router.get("/{table_id}", response_model=TableResponse)
def get_table(table_id: int, db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    table = db.query(TableInfo).filter(TableInfo.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    table_dict = TableResponse.from_orm(table)
    table_dict.attribut_count = len(table.attributs)
    return table_dict


@router.post("/", response_model=TableResponse, status_code=201)
def create_table(
    table: TableCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
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
    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_table)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="table",
        entite_id=db_table.id, nom_entite=f"{db_table.nom} ({db_table.base_donnees})",
        apres=snapshot(db_table),
    )
    return db_table


@router.put("/{table_id}", response_model=TableResponse)
def update_table(
    table_id: int,
    table: TableCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    db_table = db.query(TableInfo).filter(TableInfo.id == table_id).first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table non trouvée")

    avant = snapshot(db_table)
    for key, value in table.model_dump(exclude_unset=True).items():
        setattr(db_table, key, value)

    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_table)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="table",
        entite_id=db_table.id, nom_entite=f"{db_table.nom} ({db_table.base_donnees})",
        avant=avant, apres=snapshot(db_table),
    )
    return db_table


@router.delete("/{table_id}", status_code=204)
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_deleter),
):
    db_table = db.query(TableInfo).filter(TableInfo.id == table_id).first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table non trouvée")

    avant = snapshot(db_table)
    db.delete(db_table)
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="table",
        entite_id=table_id, nom_entite=f"{avant.get('nom', '?')} ({avant.get('base_donnees', '?')})",
        avant=avant,
    )
