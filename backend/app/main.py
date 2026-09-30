from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .config import get_settings
from .database import engine, Base
from .routers import (
    auth_router, domaines_router, processes_router, etapes_router, etapes_standalone_router,
    masques_router, services_router, procedures_router, tables_router,
    attributs_router, dcs_router, archives_router, search_router,
    etape_masques_router
)
from .routers.upload import router as upload_router

settings = get_settings()

# Créer les tables
Base.metadata.create_all(bind=engine)


def apply_schema_patches() -> None:
    """Aligne le schéma sur les modèles après la création initiale des tables.

    create_all() ne modifie jamais une table existante, donc les changements de
    colonnes sont déployés par des requêtes idempotentes.
    """
    patches = [
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'masques' AND column_name = 'image_url'
            ) THEN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'masques' AND column_name = 'image_key'
                ) THEN
                    UPDATE masques SET image_key = image_url
                    WHERE image_key IS NULL AND image_url IS NOT NULL;
                    ALTER TABLE masques DROP COLUMN image_url;
                ELSE
                    ALTER TABLE masques RENAME COLUMN image_url TO image_key;
                END IF;
            END IF;
        END $$
        """,
        "ALTER TABLE masques ADD COLUMN IF NOT EXISTS image_key VARCHAR",
        "ALTER TABLE processes ADD COLUMN IF NOT EXISTS diagramme_url VARCHAR",
        "ALTER TABLE processes ADD COLUMN IF NOT EXISTS diagramme_type VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key VARCHAR",
    ]
    with engine.begin() as conn:
        for statement in patches:
            conn.execute(text(statement))


apply_schema_patches()

# Créer l'application FastAPI
app = FastAPI(
    title="SGBackstage API",
    description="API pour la plateforme de documentation technique du SGB",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes
app.include_router(auth_router)
app.include_router(domaines_router)
app.include_router(processes_router)
app.include_router(etapes_router)
app.include_router(etapes_standalone_router)
app.include_router(masques_router)
app.include_router(etape_masques_router)
app.include_router(services_router)
app.include_router(procedures_router)
app.include_router(tables_router)
app.include_router(attributs_router)
app.include_router(dcs_router)
app.include_router(archives_router)
app.include_router(search_router)
app.include_router(upload_router)


@app.get("/")
def root():
    return {
        "message": "SGBackstage API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/api/stats")
def get_stats():
    from .database import SessionLocal
    from .models.domaine import Domaine
    from .models.process import Process
    from .models.etape import Etape
    from .models.masque import Masque
    from .models.service import Service
    from .models.table import TableInfo
    from .models.dc import DC

    db = SessionLocal()
    try:
        return {
            "domaines": db.query(Domaine).count(),
            "processes": db.query(Process).count(),
            "etapes": db.query(Etape).count(),
            "masques": db.query(Masque).count(),
            "services": db.query(Service).count(),
            "tables": db.query(TableInfo).count(),
            "dcs": db.query(DC).count()
        }
    finally:
        db.close()
