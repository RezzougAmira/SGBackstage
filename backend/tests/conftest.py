"""Configuration pytest : application FastAPI montée sur une base SQLite isolée.

Objectifs :
- ne JAMAIS toucher à la base de développement/production (Supabase) : chaque
  session de tests crée un fichier SQLite temporaire, détruit à la fin ;
- couvrir tous les routers (le probe manuel ne testait que fonctionnalités,
  services, procédures et journal) ;
- fournir des fixtures réutilisables : client HTTP, utilisateurs par rôle,
  entités du référentiel.

Ces tests sont volontairement indépendants de PostgreSQL : les patches de
schéma de app.main sont du SQL PostgreSQL, on monte donc l'application
directement à partir des routers.
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.models import (
    Archive,
    Attribut,
    Domaine,
    Etape,
    Fonctionnalite,
    Historique,
    Masque,
    ProcedureStockee,
    Process,
    Service,
    TableInfo,
    User,
)
from app.models.base import Base
from app.routers import (
    archives,
    attributs,
    auth,
    domaines,
    etapes,
    fonctionnalites,
    historique,
    masques,
    procedures,
    processes,
    search,
    services,
    tables,
)
from app.utils.auth import create_access_token, get_password_hash

# SQLite ne connaît pas JSONB : les colonnes JSON des modèles retombent sur
# TEXT, ce qui suffit pour sérialiser les snapshots du journal.
MOT_DE_PASSE_TEST = "motdepasse-test"


@pytest.fixture(scope="session")
def engine():
    chemin = os.path.join(tempfile.gettempdir(), "sgb_tests.sqlite3")
    if os.path.exists(chemin):
        os.remove(chemin)
    moteur = create_engine(
        f"sqlite:///{chemin}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=moteur)
    yield moteur
    moteur.dispose()
    if os.path.exists(chemin):
        os.remove(chemin)


@pytest.fixture()
def db(engine):
    """Session neuve, tables vidées entre deux tests."""
    session = sessionmaker(bind=engine)()
    yield session
    # Vider dans l'ordre inverse des dépendances (les enfants d'abord).
    for modele in (
        Historique,
        Attribut,
        ProcedureStockee,
        TableInfo,
        Fonctionnalite,
        Service,
        Masque,
        Etape,
        Process,
        Domaine,
        Archive,
        User,
    ):
        session.query(modele).delete()
    session.commit()
    session.close()


@pytest.fixture()
def app(engine):
    """Application montée avec tous les routers et une base isolée."""
    application = FastAPI()
    for module in (
        auth,
        domaines,
        processes,
        etapes,
        masques,
        services,
        fonctionnalites,
        procedures,
        tables,
        attributs,
        archives,
        historique,
        search,
    ):
        application.include_router(module.router)
    # Certains routers exposent un second routeur (routes sans préfixe).
    for routeur in (
        getattr(etapes, "etapes_standalone_router", None),
        getattr(masques, "masque_standalone_router", None),
        getattr(masques, "etape_masques_router", None),
    ):
        if routeur is not None:
            application.include_router(routeur)

    Session = sessionmaker(bind=engine)

    def _session_de_test():
        """Reproduit get_db, y compris le rollback sur exception.

        Les tests vérifient ainsi le comportement réel : une requête qui
        échoue ne doit rien laisser à moitié écrit.
        """
        session = Session()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    application.dependency_overrides[get_db] = _session_de_test
    return application


@pytest.fixture()
def client(app):
    return TestClient(app)


def _creer_utilisateur(db, email: str, role: str) -> User:
    utilisateur = User(
        email=email,
        password=get_password_hash(MOT_DE_PASSE_TEST),
        name=email.split("@")[0].title(),
        role=role,
        blocked=False,
    )
    db.add(utilisateur)
    db.commit()
    db.refresh(utilisateur)
    return utilisateur


@pytest.fixture()
def admin(db):
    return _creer_utilisateur(db, "admin@test.local", "admin")


@pytest.fixture()
def editeur(db):
    return _creer_utilisateur(db, "editeur@test.local", "editor")


@pytest.fixture()
def contributeur(db):
    return _creer_utilisateur(db, "contributeur@test.local", "contributor")


def entetes(utilisateur: User) -> dict:
    """Header Authorization pour un utilisateur donné."""
    token = create_access_token(data={"sub": str(utilisateur.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def entetes_admin(admin):
    return entetes(admin)


@pytest.fixture()
def entetes_editeur(editeur):
    return entetes(editeur)


@pytest.fixture()
def entetes_contributeur(contributeur):
    return entetes(contributeur)
