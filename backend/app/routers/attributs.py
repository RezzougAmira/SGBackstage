from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.attribut import Attribut
from ..models.user import User
from ..schemas.attribut import AttributCreate, AttributResponse
from ..utils.deps import require_deleter, require_writer
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/tables/{table_id}/attributs", tags=["attributs"])


@router.get("/", response_model=List[AttributResponse])
def list_attributs(table_id: int, db: Session = Depends(get_db)):
    attributs = db.query(Attribut).filter(Attribut.table_id == table_id).all()
    return [AttributResponse.from_orm(a) for a in attributs]


@router.post("/", response_model=AttributResponse, status_code=201)
def create_attribut(
    table_id: int,
    attribut: AttributCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_writer),
):
    db_attribut = Attribut(**attribut.model_dump())
    db.add(db_attribut)
    db.commit()
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

    db.commit()
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
    db.commit()
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="attribut",
        entite_id=attribut_id, nom_entite=avant.get("nom", "?"),
        avant=avant,
    )
