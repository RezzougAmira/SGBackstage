"""Génération d'un dossier Word : fiche d'un objet + son journal complet.

Le document combine deux parties pour les trois types traçables « riches »
du référentiel (masque, service, procédure stockée) :

1. la **fiche courante** de l'objet — réutilise les aides d'export_docx
   (captures, services, procédures, tables) pour rester cohérent avec les
   exports étape/process/domaine ;
2. le **journal complet** de l'objet, du plus ancien au plus récent, avec
   les instantanés avant/après. Même un objet supprimé produit un dossier
   lisible : le journal conserve les snapshots, c'est tout l'intérêt de la
   traçabilité.
"""

import io
import json
from datetime import datetime

from docx import Document
from docx.shared import Pt
from sqlalchemy.orm import Session, joinedload

from ..models.historique import Historique
from ..models.masque import EtapeMasque, Masque
from ..models.procedure import ProcedureStockee, ServiceProcedure
from ..models.service import Service
from ..models.table import ProcedureTable
from .export_docx import (
    ACCENT,
    BLEU,
    GRIS,
    _ajouter_image,
    _ajouter_masque,
    _ajouter_service,
    _run,
)
from .historique import diff

# Libellés français des colonnes retrouvées dans les snapshots du journal.
LIBELLES_CHAMPS = {
    "nom": "Nom",
    "code": "Code",
    "description": "Description",
    "methode_http": "Méthode HTTP",
    "url": "URL",
    "input_desc": "Entrée",
    "output_desc": "Sortie",
    "controleur": "Contrôleur",
    "collection": "Collection",
    "image_key": "Image",
    "titre": "Titre",
    "ordre": "Ordre",
    "base_donnees": "Base de données",
    "created_at": "Créé le",
    "updated_at": "Modifié le",
}

ACTIONS_FR = {
    "creation": "Création",
    "modification": "Modification",
    "suppression": "Suppression",
    "rattachement": "Rattachement",
    "detachement": "Détachement",
    "reorder": "Réordonnancement",
}

# Le champ « impacts » décrit les cascades de suppression côté API : il
# appartient à la logique métier, pas au contenu de l'objet lui-même.
CHAMPS_IGNORES = {"impacts"}


def _valeur_lisible(valeur) -> str:
    """Formate une valeur de snapshot pour un tableau Word."""
    if valeur is None:
        return "—"
    if isinstance(valeur, (dict, list)):
        return json.dumps(valeur, ensure_ascii=False)
    return str(valeur)


def _libelle(champ: str) -> str:
    return LIBELLES_CHAMPS.get(champ, champ.replace("_", " "))


def _titre_section(document, texte):
    _run(document.add_paragraph(), texte, gras=True, taille=14, couleur=ACCENT)


def _entete(document, titre, sous_titre):
    _run(document.add_paragraph(), titre, gras=True, taille=20, couleur=BLEU)
    _run(document.add_paragraph(), sous_titre, taille=11, couleur=GRIS)
    genere_le = datetime.now().strftime("%d/%m/%Y à %H:%M")
    _run(document.add_paragraph(), f"Document généré le {genere_le}", taille=8, couleur=GRIS)


def _tableau_details(document, lignes):
    """Tableau clé/valeur (même mise en forme que les exports existants)."""
    if not lignes:
        return
    table = document.add_table(rows=0, cols=2)
    table.style = "Table Grid"
    for libelle, valeur in lignes:
        cellules = table.add_row().cells
        _run(cellules[0].paragraphs[0], libelle, gras=True, taille=9, couleur=GRIS)
        _run(cellules[1].paragraphs[0], valeur, taille=9)


def _liste_puces(document, elements, vide="Aucun."):
    if not elements:
        _run(document.add_paragraph(), vide, italique=True, taille=9, couleur=GRIS)
        return
    for element in elements:
        document.add_paragraph(element, style="List Bullet")


# --------------------------------------------------------------------------- #
#  Fiche de l'objet                                                            #
# --------------------------------------------------------------------------- #


def _fiche_masque(db: Session, document, masque: Masque) -> None:
    # Réutilise la mise en forme complète des exports existants :
    # code + nom, description, capture, fonctionnalités > services >
    # procédures > tables.
    _ajouter_masque(db, document, masque, 0)

    etapes = [
        f"{em.etape.nom} — {em.etape.process.nom}"
        for em in masque.etapes
        if em.etape is not None
    ]
    _titre_section(document, "Utilisé dans les étapes")
    _liste_puces(document, etapes, vide="Aucune étape associée.")


def _fiche_service(db: Session, document, service: Service) -> None:
    _run(document.add_paragraph(), service.nom, gras=True, taille=16, couleur=BLEU)
    _ajouter_service(document, service)

    masques = [
        f"{ms.masque.code} — {ms.masque.nom}"
        for ms in service.masques
        if ms.masque is not None
    ]
    _titre_section(document, "Utilisé par les masques")
    _liste_puces(document, masques, vide="Aucun masque associé.")

    fonctionnalites = [
        ls.fonctionnalite.titre
        for ls in service.fonctionnalites
        if ls.fonctionnalite is not None
    ]
    _titre_section(document, "Fonctionnalités qui le mobilisent")
    _liste_puces(document, fonctionnalites, vide="Aucune fonctionnalité associée.")


def _fiche_procedure(db: Session, document, procedure: ProcedureStockee) -> None:
    _run(document.add_paragraph(), procedure.nom, gras=True, taille=16, couleur=BLEU)
    if procedure.description:
        document.add_paragraph(procedure.description)

    tables = [
        pt.table.nom
        for pt in procedure.tables
        if pt.table is not None
    ]
    _titre_section(document, "Tables consultées ou modifiées")
    _liste_puces(document, tables, vide="Aucune table associée.")

    services = []
    for sp in procedure.services:
        if sp.service is None:
            continue
        prefixe = f"{sp.service.methode_http} " if sp.service.methode_http else ""
        services.append(f"{prefixe}{sp.service.nom}")
    _titre_section(document, "Appelée par les services")
    _liste_puces(document, services, vide="Aucun service associé.")


# --------------------------------------------------------------------------- #
#  Journal de l'objet                                                          #
# --------------------------------------------------------------------------- #


def _snapshot_evenement(evt: Historique):
    """Snapshot pertinent selon l'action : après pour une création, avant
    pour une suppression, sinon celui qui existe."""
    if evt.action == "creation" and isinstance(evt.apres, dict):
        return evt.apres
    if evt.action == "suppression" and isinstance(evt.avant, dict):
        return evt.avant
    if isinstance(evt.apres, dict):
        return evt.apres
    if isinstance(evt.avant, dict):
        return evt.avant
    return None


def _tableau_avant_apres(document, avant, apres) -> None:
    """Tableau Champ | Avant | Après des seuls champs modifiés."""
    modifications = {
        champ: valeurs
        for champ, valeurs in diff(avant, apres).items()
        if champ not in CHAMPS_IGNORES
    }
    if not modifications:
        return
    table = document.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    en_tetes = ("Champ", "Avant", "Après")
    for cellule, texte in zip(table.rows[0].cells, en_tetes):
        _run(cellule.paragraphs[0], texte, gras=True, taille=9, couleur=GRIS)
    for champ in sorted(modifications):
        ancien, nouveau = modifications[champ]
        cellules = table.add_row().cells
        _run(cellules[0].paragraphs[0], _libelle(champ), gras=True, taille=9)
        _run(cellules[1].paragraphs[0], _valeur_lisible(ancien), taille=9)
        _run(cellules[2].paragraphs[0], _valeur_lisible(nouveau), taille=9)


def _ajouter_evenement(document, index: int, evt: Historique) -> None:
    paragraphe = document.add_paragraph()
    date = evt.created_at.strftime("%d/%m/%Y à %H:%M") if evt.created_at else "—"
    _run(paragraphe, f"{index}. {date} — ", gras=True, taille=10, couleur=ACCENT)
    _run(paragraphe, ACTIONS_FR.get(evt.action, evt.action), gras=True, taille=10)
    if evt.utilisateur:
        _run(paragraphe, f"  par {evt.utilisateur.name}", taille=9, couleur=GRIS)

    if evt.action == "modification":
        _tableau_avant_apres(document, evt.avant, evt.apres)
        return

    # Création, suppression, rattachement, détachement, réordonnancement :
    # on affiche le snapshot complet de l'instant T.
    snapshot = _snapshot_evenement(evt)
    if snapshot:
        _tableau_details(
            document,
            [(_libelle(c), _valeur_lisible(v)) for c, v in snapshot.items() if c not in CHAMPS_IGNORES],
        )


def _journal(db: Session, document, type_entite: str, entite_id: int) -> int:
    """Partie « journal » du dossier. Retourne le nombre d'événements."""
    evenements = (
        db.query(Historique)
        .options(joinedload(Historique.utilisateur))
        .filter(Historique.type_entite == type_entite)
        .filter(Historique.entite_id == entite_id)
        .order_by(Historique.created_at.asc(), Historique.id.asc())
        .all()
    )

    _titre_section(document, f"Journal des modifications — {len(evenements)} événement(s)")
    if not evenements:
        _run(
            document.add_paragraph(),
            "Aucun événement enregistré pour cet objet.",
            italique=True,
            taille=9,
            couleur=GRIS,
        )
        return 0

    for index, evt in enumerate(evenements, start=1):
        _ajouter_evenement(document, index, evt)
    return len(evenements)


# --------------------------------------------------------------------------- #
#  Document complet                                                            #
# --------------------------------------------------------------------------- #


def build_dossier_document(db: Session, type_entite: str, entite_id: int):
    """Construit le dossier Word (fiche + journal) d'un objet.

    Retourne (octets, nom_de_l'objet) — le nom peut être None si l'objet
    n'existe plus : le document est alors reconstitué depuis le journal.
    """
    document = Document()

    titre = None
    if type_entite == "masque":
        objet = (
            db.query(Masque)
            .options(joinedload(Masque.etapes).joinedload(EtapeMasque.etape))
            .filter(Masque.id == entite_id)
            .first()
        )
        if objet:
            titre = f"Masque {objet.code} — {objet.nom}"
    elif type_entite == "service":
        objet = (
            db.query(Service)
            .options(
                joinedload(Service.procedures).joinedload(ServiceProcedure.procedure),
                joinedload(Service.procedures)
                .joinedload(ServiceProcedure.procedure)
                .joinedload(ProcedureStockee.tables)
                .joinedload(ProcedureTable.table),
            )
            .filter(Service.id == entite_id)
            .first()
        )
        if objet:
            titre = f"Service {objet.nom}"
    elif type_entite == "procedure":
        objet = (
            db.query(ProcedureStockee)
            .options(
                joinedload(ProcedureStockee.tables).joinedload(ProcedureTable.table),
                joinedload(ProcedureStockee.services).joinedload(ServiceProcedure.service),
            )
            .filter(ProcedureStockee.id == entite_id)
            .first()
        )
        if objet:
            titre = f"Procédure {objet.nom}"
    else:
        raise ValueError(f"Type d'entité non exportable : {type_entite}")

    if titre is None:
        nom_objet = None
        titre = f"{type_entite.replace('_', ' ').capitalize()} #{entite_id}"
    else:
        nom_objet = titre

    _entete(document, titre, "Dossier de traçabilité : fiche et journal")

    _titre_section(document, "Fiche")
    if objet is None:
        _run(
            document.add_paragraph(),
            "Cet objet n'existe plus dans le référentiel (supprimé). "
            "La fiche ci-dessous est reconstituée à partir du journal.",
            italique=True,
            taille=10,
            couleur=GRIS,
        )
    elif type_entite == "masque":
        _fiche_masque(db, document, objet)
    elif type_entite == "service":
        _fiche_service(db, document, objet)
    else:
        _fiche_procedure(db, document, objet)

    _journal(db, document, type_entite, entite_id)

    tampon = io.BytesIO()
    document.save(tampon)
    return tampon.getvalue(), nom_objet
