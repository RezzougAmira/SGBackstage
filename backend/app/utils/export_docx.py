"""Génération d'un document Word décrivant une étape.

Le document reprend la hiérarchie de l'application : étape > masques >
fonctionnalités > services > procédures stockées > tables. Les captures des
masques sont relues directement depuis le bucket privé (download_file), ce qui
évite au navigateur de les télécharger et de les encoder en base64.
"""

import io
import json
from datetime import datetime

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.image.image import Image as DocxImage
from docx.oxml.ns import qn
from docx.shared import Emu, Inches, Pt, RGBColor
from sqlalchemy.orm import Session, joinedload

from ..models.etape import Etape
from ..models.fonctionnalite import Fonctionnalite, FonctionnaliteService
from ..models.process import Process
from ..models.procedure import ProcedureStockee, ServiceProcedure
from ..models.service import Service
from ..models.table import ProcedureTable
from .storage import download_file

# Palette reprise de l'interface pour rester cohérent avec l'application.
BLEU = RGBColor(0x0C, 0x1D, 0x31)
ACCENT = RGBColor(0x00, 0x30, 0x49)
GRIS = RGBColor(0x52, 0x5F, 0x6D)

# Dimensions maximales d'une capture, pour éviter qu'un écran très haut ne
# déborde sur plusieurs pages.
LARGEUR_MAX = Inches(6)
HAUTEUR_MAX = Inches(8)


def _options_fonctionnalites():
    """Eager loading des services, procédures et tables d'un masque.

    Sans ces joinedloads, les relations se chargent paresseusement et peuvent
    disparaître si la session se ferme avant la sérialisation.
    """
    return (
        joinedload(Fonctionnalite.services)
        .joinedload(FonctionnaliteService.service)
        .joinedload(Service.procedures)
        .joinedload(ServiceProcedure.procedure),
        joinedload(Fonctionnalite.services)
        .joinedload(FonctionnaliteService.service)
        .joinedload(Service.procedures)
        .joinedload(ServiceProcedure.procedure)
        .joinedload(ProcedureStockee.tables)
        .joinedload(ProcedureTable.table),
    )


def _run(paragraphe, texte, *, gras=False, italique=False, couleur=None, taille=None, mono=False):
    """Ajoute un run en fixant police, taille et couleur d'un seul coup."""
    run = paragraphe.add_run(texte)
    run.bold = gras
    run.italic = italique
    if couleur is not None:
        run.font.color.rgb = couleur
    if taille is not None:
        run.font.size = Pt(taille)
    if mono:
        run.font.name = "Consolas"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
    return run


def _ajouter_image(document, image_key):
    if not image_key:
        return
    try:
        data, _ = download_file(image_key)
    except Exception:
        document.add_paragraph("(Capture indisponible)")
        return

    try:
        # La taille naturelle (en EMU) permet de respecter le ratio tout en
        # bornant largeur et hauteur pour ne pas déborder de la page.
        image = DocxImage.from_blob(io.BytesIO(data))
        echelle = min(1.0, LARGEUR_MAX / image.width, HAUTEUR_MAX / image.height)
        document.add_picture(
            io.BytesIO(data),
            width=Emu(int(image.width * echelle)),
            height=Emu(int(image.height * echelle)),
        )
    except Exception:
        try:
            document.add_picture(io.BytesIO(data), width=Inches(6))
        except Exception:
            document.add_paragraph("(Format d'image non supporté)")
            return

    document.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER


def _ajouter_tableau_details(document, lignes):
    if not lignes:
        return
    table = document.add_table(rows=0, cols=2)
    table.style = "Table Grid"
    for libelle, valeur in lignes:
        cellules = table.add_row().cells
        _run(cellules[0].paragraphs[0], libelle, gras=True, taille=9, couleur=GRIS)
        _run(cellules[1].paragraphs[0], valeur, taille=9)


def _ajouter_procedure(document, procedure):
    paragraphe = document.add_paragraph(style="List Bullet")
    _run(paragraphe, procedure.nom, gras=True, taille=10)
    if procedure.description:
        document.add_paragraph(procedure.description)
    noms_tables = [pt.table.nom for pt in procedure.tables if pt.table is not None]
    if noms_tables:
        paragraphe = document.add_paragraph()
        _run(paragraphe, "Tables : ", gras=True, taille=9, couleur=GRIS)
        _run(paragraphe, ", ".join(noms_tables), taille=9, mono=True)


def _ajouter_service(document, service):
    paragraphe = document.add_paragraph()
    if service.methode_http:
        _run(paragraphe, f"{service.methode_http}  ", gras=True, taille=10, couleur=ACCENT, mono=True)
    _run(paragraphe, service.nom, gras=True, taille=10, mono=True)
    if service.url:
        _run(document.add_paragraph(), service.url, taille=9, couleur=GRIS, mono=True)

    lignes = []
    if service.input_desc:
        lignes.append(("Entrée", service.input_desc))
    if service.output_desc:
        lignes.append(("Sortie", service.output_desc))
    if service.controleur:
        lignes.append(("Contrôleur", service.controleur))
    if service.collection:
        lignes.append(("Collection", json.dumps(service.collection, indent=2, ensure_ascii=False)))
    _ajouter_tableau_details(document, lignes)

    procedures = [lp.procedure for lp in service.procedures if lp.procedure is not None]
    if procedures:
        titre = document.add_paragraph()
        _run(titre, "Procédures stockées", gras=True, taille=9, couleur=GRIS)
        for procedure in procedures:
            _ajouter_procedure(document, procedure)


def _ajouter_fonctionnalite(document, fonctionnalite):
    document.add_heading(fonctionnalite.titre, level=2)
    for run in document.paragraphs[-1].runs:
        run.font.color.rgb = ACCENT
    if fonctionnalite.description:
        _run(document.add_paragraph(), fonctionnalite.description, italique=True, taille=10, couleur=GRIS)

    services = [ls.service for ls in fonctionnalite.services if ls.service is not None]
    if not services:
        _run(
            document.add_paragraph(),
            "Aucun service rattaché à cette fonctionnalité.",
            italique=True,
            taille=9,
            couleur=GRIS,
        )
        return
    for service in services:
        _ajouter_service(document, service)


def _ajouter_masque(db, document, masque, index):
    if index > 0:
        document.add_page_break()
    document.add_heading(f"{masque.code} — {masque.nom}", level=1)
    for run in document.paragraphs[-1].runs:
        run.font.color.rgb = BLEU
    if masque.description:
        document.add_paragraph(masque.description)

    _ajouter_image(document, masque.image_key)

    fonctionnalites = (
        db.query(Fonctionnalite)
        .options(*_options_fonctionnalites())
        .filter(Fonctionnalite.masque_id == masque.id)
        .order_by(Fonctionnalite.ordre, Fonctionnalite.id)
        .all()
    )
    if not fonctionnalites:
        _run(
            document.add_paragraph(),
            "Aucune fonctionnalité documentée pour ce masque.",
            italique=True,
            taille=10,
            couleur=GRIS,
        )
        return
    for fonctionnalite in fonctionnalites:
        _ajouter_fonctionnalite(document, fonctionnalite)


def _ajouter_entete(document, etape):
    titre = document.add_paragraph()
    _run(titre, f"Etape {etape.ordre:02d} : {etape.nom}", gras=True, taille=20, couleur=BLEU)

    process_nom = etape.process.nom if etape.process else None
    if process_nom:
        _run(document.add_paragraph(), f"Processus : {process_nom}", taille=11, couleur=GRIS)

    if etape.description:
        _run(document.add_paragraph(), etape.description, italique=True, taille=11)

    genere_le = datetime.now().strftime("%d/%m/%Y à %H:%M")
    _run(document.add_paragraph(), f"Document généré le {genere_le}", taille=8, couleur=GRIS)


def _ajouter_etape(db: Session, document: Document, etape: Etape) -> None:
    """Insère une étape complète (en-tête + masques) sur une page neuve."""
    document.add_page_break()
    _ajouter_entete(document, etape)

    masques = [em.masque for em in etape.masques if em.masque is not None]
    if not masques:
        document.add_paragraph("Aucun masque associé à cette étape.")
    for index, masque in enumerate(masques):
        _ajouter_masque(db, document, masque, index)


def build_etape_document(db: Session, etape: Etape) -> bytes:
    """Construit le document Word d'une étape et retourne ses octets."""
    document = Document()
    _ajouter_entete(document, etape)

    masques = [em.masque for em in etape.masques if em.masque is not None]
    if not masques:
        document.add_paragraph("Aucun masque associé à cette étape.")
    for index, masque in enumerate(masques):
        _ajouter_masque(db, document, masque, index)

    tampon = io.BytesIO()
    document.save(tampon)
    return tampon.getvalue()


def _etapes_process(db: Session, process) -> list:
    return (
        db.query(Etape)
        .filter(Etape.process_id == process.id)
        .order_by(Etape.ordre, Etape.id)
        .all()
    )


def build_process_document(db: Session, process) -> bytes:
    """Construit le document Word d'un process : en-tête + tous ses étapes.

    Chaque étape reprend la même mise en forme que l'export unitaire
    (build_etape_document) : masques, fonctionnalités, services, procédures.
    """
    etapes = _etapes_process(db, process)

    document = Document()

    titre = document.add_paragraph()
    _run(titre, f"Processus : {process.nom}", gras=True, taille=22, couleur=BLEU)
    if process.description:
        _run(document.add_paragraph(), process.description, italique=True, taille=11)
    nb_masques = sum(
        1 for e in etapes for em in e.masques if em.masque is not None
    )
    _run(
        document.add_paragraph(),
        f"{len(etapes)} étape(s) — {nb_masques} masque(s)",
        taille=9,
        couleur=GRIS,
    )
    genere_le = datetime.now().strftime("%d/%m/%Y à %H:%M")
    _run(document.add_paragraph(), f"Document généré le {genere_le}", taille=8, couleur=GRIS)

    if not etapes:
        document.add_paragraph("Aucune étape associée à ce process.")
    else:
        for etape in etapes:
            _ajouter_etape(db, document, etape)

    tampon = io.BytesIO()
    document.save(tampon)
    return tampon.getvalue()


def build_domaine_document(db: Session, domaine) -> bytes:
    """Construit le document Word d'un domaine : en-tête + tous ses processes
    (chacun avec tous ses étapes, sous la même mise en forme)."""
    processes = (
        db.query(Process)
        .filter(Process.domaine_id == domaine.id)
        .order_by(Process.id)
        .all()
    )

    document = Document()

    titre = document.add_paragraph()
    _run(titre, f"Domaine : {domaine.nom}", gras=True, taille=22, couleur=BLEU)
    if domaine.description:
        _run(document.add_paragraph(), domaine.description, italique=True, taille=11)

    nb_etapes = 0
    nb_masques = 0
    for process in processes:
        for etape in _etapes_process(db, process):
            nb_etapes += 1
            nb_masques += sum(
                1 for em in etape.masques if em.masque is not None
            )
    _run(
        document.add_paragraph(),
        f"{len(processes)} process — {nb_etapes} étape(s) — {nb_masques} masque(s)",
        taille=9,
        couleur=GRIS,
    )
    genere_le = datetime.now().strftime("%d/%m/%Y à %H:%M")
    _run(document.add_paragraph(), f"Document généré le {genere_le}", taille=8, couleur=GRIS)

    if not processes:
        document.add_paragraph("Aucun process associé à ce domaine.")
    else:
        for process in processes:
            document.add_page_break()
            _run(
                document.add_paragraph(),
                f"Processus : {process.nom}",
                gras=True,
                taille=14,
                couleur=ACCENT,
            )
            if process.description:
                _run(
                    document.add_paragraph(),
                    process.description,
                    italique=True,
                    taille=10,
                    couleur=GRIS,
                )
            etapes = _etapes_process(db, process)
            if not etapes:
                _run(
                    document.add_paragraph(),
                    "Aucune étape associée à ce process.",
                    italique=True,
                    taille=9,
                    couleur=GRIS,
                )
                continue
            for etape in etapes:
                _ajouter_etape(db, document, etape)

    tampon = io.BytesIO()
    document.save(tampon)
    return tampon.getvalue()
