"""Tests d'authentification : login, blocage de compte, gestion des rôles.

Le blocage est le point sensible : un champ `blocked` que personne ne vérifie
ne protège rien. Les tests couvrent le login ET l'usage d'un token déjà émis.
"""

from .conftest import MOT_DE_PASSE_TEST, entetes


def test_login_valide(client, admin):
    reponse = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": MOT_DE_PASSE_TEST},
    )
    assert reponse.status_code == 200
    corps = reponse.json()
    assert corps["access_token"]
    assert corps["user"]["email"] == admin.email
    assert corps["user"]["role"] == "admin"


def test_login_mauvais_mot_de_passe(client, admin):
    reponse = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": "mauvais"},
    )
    assert reponse.status_code == 401
    assert "incorrect" in reponse.json()["detail"].lower()


def test_login_email_inconnu(client):
    reponse = client.post(
        "/api/auth/login",
        json={"email": "personne@test.local", "password": "peu-importe"},
    )
    assert reponse.status_code == 401


def test_login_refuse_un_compte_bloque(client, db, admin):
    """Un compte bloqué ne doit pas pouvoir ouvrir de session."""
    admin.blocked = True
    db.commit()

    reponse = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": MOT_DE_PASSE_TEST},
    )
    assert reponse.status_code == 403
    assert "bloqu" in reponse.json()["detail"].lower()


def test_token_deja_emis_invalide_si_compte_bloque(client, db, admin):
    """Bloquer un utilisateur doit couper son accès IMMÉDIATEMENT.

    Sans cette vérification, le token (valable 24 h) continuerait de
    fonctionner et le blocage n'aurait aucun effet concret.
    """
    assert client.get("/api/auth/me", headers=entetes(admin)).status_code == 200

    admin.blocked = True
    db.commit()

    reponse = client.get("/api/auth/me", headers=entetes(admin))
    assert reponse.status_code == 403


def test_me_sans_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_token_bidon(client):
    reponse = client.get("/api/auth/me", headers={"Authorization": "Bearer nimporte.quoi"})
    assert reponse.status_code == 401


def test_liste_utilisateurs_reservee_admin(client, entetes_admin, entetes_editeur):
    assert client.get("/api/auth/users", headers=entetes_admin).status_code == 200
    # Un éditeur n'est pas administrateur : la gestion des comptes lui est fermée.
    assert client.get("/api/auth/users", headers=entetes_editeur).status_code == 403


def test_creation_utilisateur_reservee_admin(client, entetes_editeur):
    reponse = client.post(
        "/api/auth/users",
        json={
            "email": "nouveau@test.local",
            "password": "unmotdepasse",
            "name": "Nouveau",
            "role": "contributor",
        },
        headers=entetes_editeur,
    )
    assert reponse.status_code == 403
