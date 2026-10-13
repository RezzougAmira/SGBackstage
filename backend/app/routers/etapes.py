import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.etape import Etape
from ..models.masque import EtapeMasque
from ..models.process import Process
from ..models.user import User
from ..utils import impact
from ..utils.deps import get_current_user
from ..utils.historique import enregistrer_historique, snapshot
from ..utils.export_docx import build_etape_document, build_process_document
from ..schemas.etape import (
    EtapeCreate,
    EtapeResponse,
    EtapeReorder,
    EtapeDetailResponse,
    EtapeImpact,
    EtapeMasqueImpact,
    EtapeSuppressionResult,
    EtapeDetachMasqueResult,
    SuppressionRapport,
    MasqueRef,
    FonctionRef,
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
        # Le nom du processus permet d'afficher un titre complet sur la page
        # de l'étape, y compris après un rechargement direct de l'URL.
        process_nom=etape.process.nom if etape.process else None,
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
            fref = FonctionRef(
                id=svc.id,
                nom=svc.nom,
                description=None,
                services=[sref],
            )
            mref.fonctions.append(fref)
        data.masques.append(mref)
    return data


@router.get("/", response_model=List[EtapeResponse])
def list_etapes(process_id: int, db: Session = Depends(get_db)):
    etapes = db.query(Etape).filter(Etape.process_id == process_id).order_by(Etape.ordre).all()
    return [EtapeResponse.from_orm(e) for e in etapes]


def _charger_etape(db: Session, process_id: int, etape_id: int) -> Etape:
    etape = db.query(Etape).filter(
        Etape.id == etape_id,
        Etape.process_id == process_id
    ).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")
    return etape


def _impact_masques(db: Session, etape: Etape) -> List[EtapeMasqueImpact]:
    """Dimensionne, pour chaque masque de l'étape, ce que sa suppression coûterait."""
    elements = []
    for em in etape.masques:
        masque = em.masque
        if not masque:
            continue
        etapes_utilisatrices = impact.etapes_du_masque(db, masque.id)
        services = [ms.service for ms in masque.services if ms.service]
        service_ids = [s.id for s in services]
        elements.append(
            EtapeMasqueImpact(
                id=masque.id,
                code=masque.code,
                nom=masque.nom,
                etape_count=len(etapes_utilisatrices),
                autres_etapes=[
                    impact.libelle_etape(e)
                    for e in etapes_utilisatrices
                    if e.id != etape.id
                ],
                # L'interface présente un service par « fonction » : les deux
                # listes portent le même cardinal.
                fonctions_count=len(services),
                services_count=len(services),
                procedures_count=impact.compter_procedures(db, service_ids),
            )
        )
    return elements


@router.get("/{etape_id}", response_model=EtapeDetailResponse)
def get_etape(process_id: int, etape_id: int, db: Session = Depends(get_db)):
    return _build_detail(_charger_etape(db, process_id, etape_id))


@etapes_standalone_router.get("/etapes/{etape_id}/impact", response_model=EtapeImpact)
def get_etape_impact(etape_id: int, db: Session = Depends(get_db)):
    """Ce que la suppression de l'étape va coûter, pour la confirmation."""
    etape = db.query(Etape).filter(Etape.id == etape_id).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")
    return EtapeImpact(
        masques=_impact_masques(db, etape),
    )


@router.post("/", response_model=EtapeResponse, status_code=201)
def create_etape(
    process_id: int,
    etape: EtapeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = (
        db.query(Etape)
        .filter(Etape.process_id == process_id, Etape.nom == etape.nom)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une étape avec ce nom existe déjà dans ce processus"
        )

    # L'ordre est une position dans le flux : il doit se situer entre le début
    # et la fin de la liste existante, sinon l'étape n'a pas de place.
    dernier_ordre = (
        db.query(func.max(Etape.ordre)).filter(Etape.process_id == process_id).scalar() or 0
    )
    if etape.ordre < 1 or etape.ordre > dernier_ordre + 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"L'ordre doit être compris entre 1 et {dernier_ordre + 1} "
                f"pour {dernier_ordre} étape(s) existante(s)."
            ),
        )

    # Insertion : les étapes situées à la position demandée ou après reculent
    # d'un rang pour libérer la place, l'ordre reste 1..N sans doublon.
    if etape.ordre <= dernier_ordre:
        (
            db.query(Etape)
            .filter(Etape.process_id == process_id, Etape.ordre >= etape.ordre)
            .update({Etape.ordre: Etape.ordre + 1}, synchronize_session=False)
        )

    db_etape = Etape(**{**etape.model_dump(), "process_id": process_id})
    db.add(db_etape)
    db.commit()
    db.refresh(db_etape)
    enregistrer_historique(
        db, utilisateur=user, action="creation", type_entite="etape",
        entite_id=db_etape.id, nom_entite=db_etape.nom,
        apres=snapshot(db_etape),
    )
    return db_etape


@router.put("/{etape_id}", response_model=EtapeResponse)
def update_etape(
    process_id: int,
    etape_id: int,
    etape: EtapeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db_etape = _charger_etape(db, process_id, etape_id)

    avant = snapshot(db_etape)
    for key, value in etape.model_dump(exclude_unset=True).items():
        setattr(db_etape, key, value)

    db.commit()
    db.refresh(db_etape)
    enregistrer_historique(
        db, utilisateur=user, action="modification", type_entite="etape",
        entite_id=db_etape.id, nom_entite=db_etape.nom,
        avant=avant, apres=snapshot(db_etape),
    )
    return db_etape


@router.delete("/{etape_id}", response_model=EtapeSuppressionResult)
def delete_etape(
    process_id: int,
    etape_id: int,
    supprimer_masques: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Supprime l'étape, et ses masques seulement si l'utilisateur le demande.

    Par défaut l'étape disparaît mais les masques sont conservés : ils peuvent
    être portés par d'autres étapes du même domaine. Le choix est explicite
    parce que supprimer un masque emporte ses liens vers toutes les autres
    étapes.
    """
    db_etape = _charger_etape(db, process_id, etape_id)

    # Les liens sont relevés avant la suppression : une fois l'étape supprimée,
    # ses liens vers les masques disparaissent avec elle.
    masques = [em.masque for em in db_etape.masques if em.masque]
    masques_avant = {m.id: snapshot(m) for m in masques}
    supprimes: List[str] = []
    conserves: List[str] = []
    supprimes_ids: List[int] = []

    # L'ordre est une position dans le flux : la suppression ne doit pas
    # laisser de trou, les étapes suivantes remontent d'un rang (1..N).
    ordre_supprime = db_etape.ordre

    db.delete(db_etape)
    db.flush()

    if ordre_supprime is not None:
        (
            db.query(Etape)
            .filter(Etape.process_id == process_id, Etape.ordre > ordre_supprime)
            .update({Etape.ordre: Etape.ordre - 1}, synchronize_session=False)
        )

    if supprimer_masques:
        for masque in masques:
            others = [
                e for e in impact.etapes_du_masque(db, masque.id)
            ]
            detail = (
                f" — également utilisé dans {len(others)} autre(s) étape(s)"
                if others
                else ""
            )
            db.delete(masque)
            supprimes_ids.append(masque.id)
            supprimes.append(f"{masque.code} — {masque.nom}{detail}")

    db.commit()

    # Journal : l'étape disparaît, et chacun des masques qu'elle emporte avec elle.
    enregistrer_historique(
        db, utilisateur=user, action="suppression", type_entite="etape",
        entite_id=etape_id, nom_entite=db_etape.nom,
        avant=snapshot(db_etape),
    )
    for mid in supprimes_ids:
        avant = masques_avant[mid]
        enregistrer_historique(
            db, utilisateur=user, action="suppression", type_entite="masque",
            entite_id=mid, nom_entite=f"{avant.get('code', '?')} — {avant.get('nom', '?')}",
            avant=avant,
        )

    return EtapeSuppressionResult(
        etape=SuppressionRapport(nom=db_etape.nom, supprimes=[db_etape.nom]),
        masques=SuppressionRapport(
            nom="Masques associés", supprimes=supprimes, conserves=conserves
        ),
    )


@router.put("/reorder")
def reorder_etapes(
    process_id: int,
    reorder: EtapeReorder,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for index, etape_id in enumerate(reorder.etape_ids):
        etape = db.query(Etape).filter(
            Etape.id == etape_id,
            Etape.process_id == process_id
        ).first()
        if etape:
            etape.ordre = index + 1
    db.commit()
    enregistrer_historique(
        db, utilisateur=user, action="reorder", type_entite="etape",
        entite_id=None, nom_entite=f"Ordre des étapes (processus {process_id})",
        apres={"etape_ids": reorder.etape_ids},
    )
    return {"message": "Étapes réordonnées"}


@etapes_standalone_router.get("/etapes/{etape_id}", response_model=EtapeDetailResponse)
def get_etape_standalone(etape_id: int, db: Session = Depends(get_db)):
    etape = db.query(Etape).filter(Etape.id == etape_id).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")
    return _build_detail(etape)


DOCX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


def _slug_fichier(texte: str) -> str:
    """Nom de fichier sûr : minuscules, sans accent ni caractère interdit."""
    sans_accent = (
        texte.replace("é", "e").replace("è", "e").replace("ê", "e")
        .replace("à", "a").replace("â", "a").replace("î", "i")
        .replace("ï", "i").replace("ô", "o").replace("û", "u")
        .replace("ù", "u").replace("ç", "c").replace("œ", "oe")
    )
    return re.sub(r"[^a-zA-Z0-9]+", "-", sans_accent).strip("-").lower() or "etape"


@etapes_standalone_router.get("/etapes/{etape_id}/export")
def export_etape_docx(etape_id: int, db: Session = Depends(get_db)):
    """Génère le document Word de l'étape (masques, fonctionnalités, services).

    La génération est faite côté serveur : le backend lit les captures du
    bucket privé directement, sans repasser par le navigateur.
    """
    etape = db.query(Etape).filter(Etape.id == etape_id).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")

    contenu = build_etape_document(db, etape)
    nom_fichier = f"etape-{etape.ordre:02d}-{_slug_fichier(etape.nom)}.docx"
    return Response(
        content=contenu,
        media_type=DOCX_MEDIA_TYPE,
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{nom_fichier}\"; "
                f"filename*=UTF-8''{quote(nom_fichier)}"
            )
        },
    )


@etapes_standalone_router.get("/processes/{process_id}/export")
def export_process_docx(process_id: int, db: Session = Depends(get_db)):
    """Génère le document Word du process regroupant toutes ses étapes."""
    process = db.query(Process).filter(Process.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process non trouvé")

    contenu = build_process_document(db, process)
    nom_fichier = f"process-{_slug_fichier(process.nom)}.docx"
    return Response(
        content=contenu,
        media_type=DOCX_MEDIA_TYPE,
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{nom_fichier}\"; "
                f"filename*=UTF-8''{quote(nom_fichier)}"
            )
        },
    )


@etapes_standalone_router.delete(
    "/etapes/{etape_id}/masques/{masque_id}", response_model=EtapeDetachMasqueResult
)
def detach_masque_de_etape(
    etape_id: int,
    masque_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retire un masque de cette étape sans toucher au masque lui-même.

    C'est le retrait « souple » : le masque reste dans la bibliothèque et dans
    les autres étapes où il est utilisé. Le détachement est demandé au client
    pour ne pas laisser un objet partager entre plusieurs étapes orphelin.
    """
    etape = db.query(Etape).filter(Etape.id == etape_id).first()
    if not etape:
        raise HTTPException(status_code=404, detail="Étape non trouvée")

    lien = (
        db.query(EtapeMasque)
        .filter(
            EtapeMasque.etape_id == etape_id,
            EtapeMasque.masque_id == masque_id,
        )
        .first()
    )
    if not lien:
        raise HTTPException(
            status_code=404, detail="Ce masque n'est pas rattaché à cette étape"
        )

    db.delete(lien)
    db.commit()
    enregistrer_historique(
        db, utilisateur=user, action="detachement", type_entite="masque",
        entite_id=masque_id,
        nom_entite=f"{lien.masque.code} — {lien.masque.nom}",
        apres={"etape_id": etape_id, "masque_id": masque_id},
    )
    return EtapeDetachMasqueResult(message="Masque retiré de l'étape")
