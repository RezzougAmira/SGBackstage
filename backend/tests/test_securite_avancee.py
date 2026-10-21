"""Tests des garanties de sécurité et d'intégrité.

- Anti-force brute sur la connexion (limiteur_connexion).
- Atomicité : une mutation qui échoue au moment du journal ne doit rien
  laisser derrière elle (pas de base écrite sans trace, pas de trace sans
  donnée).
"""

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Domaine, Historique
from app.utils import limiteur_connexion
from app.utils.historique import enregistrer_historique

from .conftest import MOT_DE_PASSE_TEST


@pytest.fixture(autouse=True)
def _limiteur_propre():
    """Chaque test part d'un compteur vierge."""
    limiteur_connexion.reinitialiser_tout()
    yield
    limiteur_connexion.reinitialiser_tout()


# --------------------------------------------------------------------------- #
#  Anti-force brute                                                             #
# --------------------------------------------------------------------------- #


def test_blocage_apres_cinq_echecs(client, admin):
    """Le 5e échec déclenche le blocage : le suivant est refusé en 429."""
    codes = []
    for _ in range(limiteur_connexion.MAX_ECHECS):
        reponse = client.post(
            "/api/auth/login",
            json={"email": admin.email, "password": "faux"},
        )
        codes.append(reponse.status_code)

    # Les 4 premiers échecs sont des 401, le 5e annonce déjà le blocage.
    assert codes[: limiteur_connexion.MAX_ECHECS - 1] == [401] * (
        limiteur_connexion.MAX_ECHECS - 1
    )
    assert codes[-1] == 429

    reponse = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": MOT_DE_PASSE_TEST},
    )
    assert reponse.status_code == 429
    assert reponse.headers.get("Retry-After")


def test_email_inconnu_compte_aussi(client):
    """Un attaquant ne doit pas pouvoir sonder les adresses sans être ralenti."""
    for _ in range(limiteur_connexion.MAX_ECHECS):
        client.post(
            "/api/auth/login",
            json={"email": "inconnu@test.local", "password": "x"},
        )
    reponse = client.post(
        "/api/auth/login",
        json={"email": "inconnu@test.local", "password": "x"},
    )
    assert reponse.status_code == 429


def test_succes_remet_le_compteur_a_zero(client, admin):
    """Un utilisateur légitime ne doit pas finir bloqué par ses fautes de frappe."""
    for _ in range(limiteur_connexion.MAX_ECHECS - 1):
        client.post(
            "/api/auth/login",
            json={"email": admin.email, "password": "faux"},
        )
    # Bon mot de passe avant le seuil : accepté.
    assert client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": MOT_DE_PASSE_TEST},
    ).status_code == 200

    # Le compteur est reparti de zéro : un nouvel échec ne bloque pas.
    reponse = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": "faux"},
    )
    assert reponse.status_code == 401


def test_message_identifie_le_blocage(client, admin):
    reponse = None
    for _ in range(limiteur_connexion.MAX_ECHECS + 1):
        reponse = client.post(
            "/api/auth/login",
            json={"email": admin.email, "password": "faux"},
        )
    assert reponse is not None
    assert reponse.status_code == 429
    assert "tentatives" in reponse.json()["detail"].lower()


# --------------------------------------------------------------------------- #
#  Atomicité mutation + journal                                                 #
# --------------------------------------------------------------------------- #


def test_journal_et_mutation_dans_la_meme_transaction(client, db, entetes_editeur):
    """Créer un domaine écrit la donnée ET sa trace, les deux visibles."""
    reponse = client.post(
        "/api/domaines/",
        json={"nom": "Domaine atomique", "description": ""},
        headers=entetes_editeur,
    )
    assert reponse.status_code in (200, 201)

    db.expire_all()
    assert db.query(Domaine).filter(Domaine.nom == "Domaine atomique").count() == 1
    assert db.query(Historique).filter(Historique.type_entite == "domaine").count() >= 1


def test_echec_du_journal_annule_la_mutation(db):
    """Si l'entrée de journal échoue, la mutation ne doit pas rester en base.

    L'échec est provoqué par un argument invalide passé à l'écriture du
    journal : la transaction commune est cassée, le rollback doit donc
    emporter le domaine ajouté juste avant.
    """
    domaine = Domaine(nom="À annuler", description="")
    db.add(domaine)
    db.flush()  # la donnée est présente dans la transaction, non committée

    with pytest.raises(TypeError):
        enregistrer_historique(
            db,
            utilisateur=None,
            action="creation",
            type_entite="domaine",
            entite_id=domaine.id,
            colonne_inexistante="boum",  # argument refusé par la fonction
        )

    # Rien n'a été committé : la mutation n'existe pas en base.
    db.rollback()
    assert db.query(Domaine).filter(Domaine.nom == "À annuler").count() == 0


def test_stats_exige_un_token():
    """Le tableau de bord nomme des contributeurs : il n'est pas public.

    /api/stats est déclaré dans app.main (pas dans un routeur) : on inspecte
    donc la signature de la route réelle plutôt que de monter l'application
    complète, qui exigerait une base PostgreSQL pour ses patches de schéma.
    """
    from app.main import app

    route_stats = next(
        r for r in app.routes if getattr(r, "path", None) == "/api/stats"
    )
    dependances = {
        getattr(dep.call, "__name__", str(dep.call))
        for dep in route_stats.dependant.dependencies
    }
    assert "get_current_user" in dependances, (
        "/api/stats doit exiger un utilisateur authentifié"
    )
