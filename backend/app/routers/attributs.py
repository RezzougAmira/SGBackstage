from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.attribut import Attribut
from ..models.table import TableInfo
from ..models.user import User
from ..schemas.attribut import AttributCreate, AttributResponse
from ..schemas.common import PageParams, PaginatedResponse
from ..utils.deps import get_current_user, require_deleter, require_writer
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/tables/{table_id}/attributs", tags=["attributs"])


def _verifier_table(db: Session, table_id: int) -> TableInfo:
    """La table du chemin doit exister : sans ce contrôle, un attribut
    pourrait être créé avec un table_id fantôme (et le rattachement resterait
    invisible dans toute l'application)."""
    table = db.query(TableInfo).filter(TableInfo.id == table_id).first()
    if table is None:
        raise HTTPException(status_code=404, detail="Table non trouvée")
    return table


@router.get("/", response_model=PaginatedResponse[AttributResponse])
def list_attributs(
    table_id: int,
    pagination: PageParams = Depends(),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste paginée des attributs d'une table."""
    query = db.query(Attribut).filter(Attribut.table_id == table_id)
    total = query.count()
    items = (
        query.order_by(Attribut.nom)
        .offset((pagination.page - 1) * pagination.page_size)
        .limit(pagination.page_size)
        .all()
    )
    return PaginatedResponse.create([AttributResponse.from_orm(a) for a in items], total, pagination)


@router.post("/", response_model=AttributResponse, status_code=201)
def create_attribut(
    table_id: int,
    attribut: AttributCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    _verifier_table(db, table_id)
    # Le table_id du chemin fait foi : celui du corps est ignoré, sinon un
    # client pourrait rattacher l'attribut à une autre table que celle de
    # l'URL (les routes de lecture, elles, filtrent sur l'URL).
    donnees = attribut.model_dump()
    donnees["table_id"] = table_id

    db_attribut = Attribut(**donnees)
    db.add(db_attribut)
    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_attribut)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="attribut",
        entite_id=db_attribut.id, nom_entite=db_attribut.nom,
        apres=snapshot(db_attribut),
    )
    return db_attribut


@router.put("/{attribut_id}", response_model=AttributResponse)
def update_attribut(
    table_id: int,
    attribut_id: int,
    attribut: AttributCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    db_attribut = db.query(Attribut).filter(
        Attribut.id == attribut_id,
        Attribut.table_id == table_id
    ).first()
    if not db_attribut:
        raise HTTPException(status_code=404, detail="Attribut non trouvé")

    avant = snapshot(db_attribut)
    for key, value in attribut.model_dump(exclude_unset=True).items():
        setattr(db_attribut, key, value)

    db.flush()  # transaction ouverte : commit au journal
    db.refresh(db_attribut)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="attribut",
        entite_id=db_attribut.id, nom_entite=db_attribut.nom,
        avant=avant, apres=snapshot(db_attribut),
    )
    return db_attribut


@router.delete("/{attribut_id}", status_code=204)
def delete_attribut(
    table_id: int,
    attribut_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_deleter),
):
    db_attribut = db.query(Attribut).filter(
        Attribut.id == attribut_id,
        Attribut.table_id == table_id
    ).first()
    if not db_attribut:
        raise HTTPException(status_code=404, detail="Attribut non trouvé")

    avant = snapshot(db_attribut)
    db.delete(db_attribut)
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="attribut",
        entite_id=attribut_id, nom_entite=avant.get("nom", "?"),
        avant=avant,
    )
