"""Tests de la recherche serveur des listes services et procédures.

Sans ce filtre, le front chargeait les 500 premières lignes puis filtrait
localement : au-delà de 500 services, les éléments suivants n'apparaissaient
jamais dans le combobox de rattachement.
"""

from app.models import ProcedureStockee, Service


def test_recherche_services_par_nom_url_et_controleur(client, db, entetes_editeur):
    db.add_all(
        [
            Service(nom="GetClient", url="/api/clients/{id}"),
            Service(nom="CreateCard", url="/api/cards", controleur="ClientController"),
            Service(nom="GetCompte", url="/api/comptes"),
            Service(
                nom="UpdateSolde",
                input_desc="Montant du compte à créditer",
                output_desc="Nouveau solde",
            ),
        ]
    )
    db.commit()

    reponse = client.get("/api/services/?q=client", headers=entetes_editeur)
    assert reponse.status_code == 200, reponse.text
    donnees = reponse.json()
    assert donnees["total"] == 2
    assert {s["nom"] for s in donnees["items"]} == {"GetClient", "CreateCard"}

    # Recherche insensible à la casse.
    majuscules = client.get("/api/services/?q=CLIENT", headers=entetes_editeur)
    assert majuscules.json()["total"] == 2

    # Recherche dans l'URL.
    par_url = client.get("/api/services/?q=/api/cards", headers=entetes_editeur)
    assert [s["nom"] for s in par_url.json()["items"]] == ["CreateCard"]

    # Recherche dans les descriptions d'entrée / sortie.
    par_description = client.get("/api/services/?q=créditer", headers=entetes_editeur)
    assert [s["nom"] for s in par_description.json()["items"]] == ["UpdateSolde"]


def test_recherche_services_est_paginee(client, db, entetes_editeur):
    db.add_all([Service(nom=f"Service {i:02d}") for i in range(1, 26)])
    db.commit()

    page1 = client.get(
        "/api/services/?q=service&page=1&page_size=20", headers=entetes_editeur
    ).json()
    page2 = client.get(
        "/api/services/?q=service&page=2&page_size=20", headers=entetes_editeur
    ).json()

    assert page1["total"] == 25
    assert page1["total_pages"] == 2
    assert len(page1["items"]) == 20
    assert page2["total"] == 25
    assert len(page2["items"]) == 5
    assert page2["page"] == 2
    assert {s["id"] for s in page1["items"]}.isdisjoint(
        {s["id"] for s in page2["items"]}
    )


def test_recherche_procedures_par_nom_ou_description(client, db, entetes_editeur):
    db.add_all(
        [
            ProcedureStockee(nom="SP_SOLDE", description="Calcul du solde client"),
            ProcedureStockee(nom="SP_CARTE", description="Création de carte"),
        ]
    )
    db.commit()

    par_description = client.get(
        "/api/procedures/?q=solde", headers=entetes_editeur
    ).json()
    assert par_description["total"] == 1
    assert par_description["items"][0]["nom"] == "SP_SOLDE"

    par_nom = client.get("/api/procedures/?q=carte", headers=entetes_editeur).json()
    assert par_nom["total"] == 1
    assert par_nom["items"][0]["nom"] == "SP_CARTE"

    aucun = client.get("/api/procedures/?q=introuvable", headers=entetes_editeur).json()
    assert aucun["total"] == 0
    assert aucun["items"] == []


def test_recherche_vide_retourne_tout(client, db, entetes_editeur):
    db.add_all([Service(nom="A"), Service(nom="B"), Service(nom="C")])
    db.commit()

    donnees = client.get("/api/services/?q=", headers=entetes_editeur).json()
    assert donnees["total"] == 3
