from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models.masque import Masque
from ..models.service import Service
from ..models.table import TableInfo
from ..models.user import User
from ..utils.deps import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/")
def search(
    query: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    results = {
        "masques": [],
        "services": [],
        "tables": []
    }

    # Rechercher dans les masques
    masques = db.query(Masque).filter(
        Masque.code.ilike(f"%{query}%") |
        Masque.nom.ilike(f"%{query}%")
    ).limit(10).all()
    results["masques"] = [
        {"id": m.id, "code": m.code, "nom": m.nom}
        for m in masques
    ]

    # Rechercher dans les services
    services = db.query(Service).filter(
        Service.nom.ilike(f"%{query}%")
    ).limit(10).all()
    results["services"] = [
        {"id": s.id, "nom": s.nom}
        for s in services
    ]

    # Rechercher dans les tables
    tables = db.query(TableInfo).filter(
        TableInfo.nom.ilike(f"%{query}%")
    ).limit(10).all()
    results["tables"] = [
        {"id": t.id, "nom": t.nom}
        for t in tables
    ]

    return results
