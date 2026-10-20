"""Tests de sécurité : les routes de lecture ne doivent pas être publiques.

Le référentiel (masques, services, tables SQL, procédures stockées) décrit le
système bancaire : rien ne doit être lisible sans être authentifié.
"""

import pytest

# Routes de lecture qui exposaient le référentiel sans token.
ROUTES_PROTEGEES = [
    "/api/domaines/",
    "/api/domaines/1",
    "/api/domaines/1/processes/",
    "/api/domaines/1/processes/1",
    "/api/etapes/1",
    "/api/masques/",
    "/api/masques/1",
    "/api/masques/1/impact",
    "/api/services/",
    "/api/services/1",
    "/api/procedures/",
    "/api/procedures/1",
    "/api/tables/",
    "/api/tables/1",
    "/api/tables/1/attributs/",
    "/api/fonctionnalites/masque/1",
    "/api/fonctionnalites/1",
    "/api/archives/",
    "/api/archives/1",
    "/api/historique/",
    "/api/historique/utilisateurs",
    "/api/search/?query=test",
    "/api/etapes/1/impact",
]


@pytest.mark.parametrize("route", ROUTES_PROTEGEES)
def test_route_refuse_sans_token(client, route):
    """Sans header Authorization : 401, jamais 200."""
    reponse = client.get(route)
    assert reponse.status_code == 401, f"{route} est accessible sans authentification"


@pytest.mark.parametrize("route", ROUTES_PROTEGEES)
def test_route_refuse_token_invalide(client, route):
    reponse = client.get(route, headers={"Authorization": "Bearer faux.jwt.token"})
    assert reponse.status_code == 401, f"{route} accepte un token invalide"
