"""Tests des correctifs : réordonnancement des étapes et rattachement d'attributs.

Deux bugs corrigés ici :
- `PUT /processes/{id}/etapes/reorder` était déclaré APRÈS `/{etape_id}` :
  Starlette matche dans l'ordre d'enregistrement, la route était donc
  injoignable (422 au lieu d'un réordonnancement).
- `POST /api/tables/{id}/attributs/` utilisait le `table_id` du corps au lieu
  de celui de l'URL : un attribut pouvait être rattaché à une autre table.
"""

from app.models import Attribut, Domaine, Etape, Masque, Process, TableInfo


def _creer_process_avec_etapes(db, entrees):
    domaine = Domaine(nom="Domaine test", description="")
    db.add(domaine)
    db.commit()
    process = Process(nom="Process test", domaine_id=domaine.id)
    db.add(process)
    db.commit()
    etapes = []
    for index, nom in enumerate(entrees, start=1):
        etape = Etape(nom=nom, ordre=index, process_id=process.id)
        db.add(etape)
        etapes.append(etape)
    db.commit()
    for etape in etapes:
        db.refresh(etape)
    return process, etapes


# --------------------------------------------------------------------------- #
#  Réordonnancement                                                            #
# --------------------------------------------------------------------------- #


def test_reorder_etapes_est_atteignable(client, db, entetes_editeur):
    """La route /reorder ne doit plus être avalée par /{etape_id}."""
    process, etapes = _creer_process_avec_etapes(db, ["Un", "Deux", "Trois"])
    ordre_inverse = [e.id for e in reversed(etapes)]

    reponse = client.put(
        f"/api/processes/{process.id}/etapes/reorder",
        json={"etape_ids": ordre_inverse},
        headers=entetes_editeur,
    )

    # 422 = la route a été confondue avec /{etape_id} (bug d'origine).
    assert reponse.status_code == 200, reponse.text

    db.expire_all()
    ordres = {
        e.id: e.ordre for e in db.query(Etape).filter(Etape.process_id == process.id)
    }
    assert ordres[ordre_inverse[0]] == 1
    assert ordres[ordre_inverse[-1]] == len(ordre_inverse)


def test_reorder_journalise(client, db, entetes_editeur):
    process, etapes = _creer_process_avec_etapes(db, ["Un", "Deux"])
    client.put(
        f"/api/processes/{process.id}/etapes/reorder",
        json={"etape_ids": [e.id for e in reversed(etapes)]},
        headers=entetes_editeur,
    )
    from app.models import Historique

    evenement = (
        db.query(Historique)
        .filter(Historique.action == "reorder", Historique.type_entite == "etape")
        .first()
    )
    assert evenement is not None


def test_reorder_interdit_au_lecteur_sans_role(client, db):
    """Sans token, le réordonnancement est refusé."""
    process, etapes = _creer_process_avec_etapes(db, ["Un", "Deux"])
    reponse = client.put(
        f"/api/processes/{process.id}/etapes/reorder",
        json={"etape_ids": [e.id for e in reversed(etapes)]},
    )
    assert reponse.status_code == 401


# --------------------------------------------------------------------------- #
#  Attributs : le table_id de l'URL fait foi                                    #
# --------------------------------------------------------------------------- #


def _creer_table(db, nom):
    table = TableInfo(nom=nom, base_donnees="SGB", description="")
    db.add(table)
    db.commit()
    db.refresh(table)
    return table


def test_attribut_rattache_a_la_table_de_l_url(client, db, entetes_editeur):
    """Le table_id du corps ne doit pas pouvoir détourner le rattachement."""
    table_a = _creer_table(db, "TABLE_A")
    table_b = _creer_table(db, "TABLE_B")

    reponse = client.post(
        f"/api/tables/{table_a.id}/attributs/",
        json={"nom": "COLONNE", "type": "VARCHAR", "table_id": table_b.id},
        headers=entetes_editeur,
    )
    assert reponse.status_code == 201, reponse.text
    # Le rattachement suit l'URL, pas le corps de la requête.
    assert reponse.json()["table_id"] == table_a.id

    db.expire_all()
    attribut = db.query(Attribut).filter(Attribut.nom == "COLONNE").first()
    assert attribut.table_id == table_a.id


def test_attribut_refuse_table_inexistante(client, db, entetes_editeur):
    reponse = client.post(
        "/api/tables/999999/attributs/",
        json={"nom": "COLONNE", "type": "VARCHAR"},
        headers=entetes_editeur,
    )
    assert reponse.status_code == 404


def test_attribut_sans_table_id_dans_le_corps(client, db, entetes_editeur):
    """Le champ reste optionnel : les clients existants continuent de marcher."""
    table = _creer_table(db, "TABLE_C")
    reponse = client.post(
        f"/api/tables/{table.id}/attributs/",
        json={"nom": "COLONNE", "type": "INT"},
        headers=entetes_editeur,
    )
    assert reponse.status_code == 201
    assert reponse.json()["table_id"] == table.id
