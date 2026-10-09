from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .config import get_settings
from .database import engine, Base
from .routers import (
    auth_router, domaines_router, processes_router, etapes_router, etapes_standalone_router,
    masques_router, services_router, procedures_router, tables_router,
    attributs_router, archives_router, search_router,
    etape_masques_router, fonctionnalites_router, historique_router
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
        "ALTER TABLE services ADD COLUMN IF NOT EXISTS collection JSON",
        # Fonctionnalités : les tables sont créées ici et pas via create_all(),
        # car main.py importe le Base de database.py, qui n'est pas celui des
        # modèles (deux bases déclaratives distinctes).
        """
        CREATE TABLE IF NOT EXISTS fonctionnalites (
            id SERIAL PRIMARY KEY,
            titre VARCHAR(255) NOT NULL,
            description TEXT,
            masque_id INTEGER NOT NULL REFERENCES masques(id) ON DELETE CASCADE,
            ordre INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS fonctionnalite_services (
            id SERIAL PRIMARY KEY,
            fonctionnalite_id INTEGER NOT NULL
                REFERENCES fonctionnalites(id) ON DELETE CASCADE,
            service_id INTEGER NOT NULL
                REFERENCES services(id) ON DELETE CASCADE
        )
        """,
        # Migration etape_id -> masque_id : la fonctionnalité appartient au
        # masque (la page technique), pas à l'étape. Les anciennes lignes
        # créées sur base d'etape_id sont abandonnées (section vidée avant la
        # bascule).
        "ALTER TABLE fonctionnalites ADD COLUMN IF NOT EXISTS masque_id INTEGER REFERENCES masques(id) ON DELETE CASCADE",
        "DELETE FROM fonctionnalites WHERE masque_id IS NULL",
        "ALTER TABLE fonctionnalites ALTER COLUMN masque_id SET NOT NULL",
        "ALTER TABLE fonctionnalites DROP COLUMN IF EXISTS etape_id",
        "CREATE INDEX IF NOT EXISTS ix_fonctionnalites_masque_id ON fonctionnalites(masque_id)",
        # Journal des changements : qui, quand, sur quoi, et le détail avant/après.
        """
        CREATE TABLE IF NOT EXISTS historique (
            id SERIAL PRIMARY KEY,
            utilisateur_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(20) NOT NULL,
            type_entite VARCHAR(30) NOT NULL,
            entite_id INTEGER,
            nom_entite VARCHAR(255),
            avant JSONB,
            apres JSONB,
            created_at TIMESTAMP DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_historique_created_at ON historique(created_at)",
        "CREATE INDEX IF NOT EXISTS ix_historique_type_entite ON historique(type_entite, entite_id)",
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
app.include_router(fonctionnalites_router)
app.include_router(procedures_router)
app.include_router(tables_router)
app.include_router(attributs_router)
app.include_router(archives_router)
app.include_router(search_router)
app.include_router(historique_router)
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
    """Compteurs et activité du journal, pour le tableau de bord."""
    from datetime import datetime, timedelta

    from sqlalchemy import func

    from .database import SessionLocal
    from .models.archive import Archive
    from .models.attribut import Attribut
    from .models.domaine import Domaine
    from .models.etape import Etape
    from .models.fonctionnalite import Fonctionnalite
    from .models.historique import Historique
    from .models.masque import Masque
    from .models.procedure import ProcedureStockee
    from .models.process import Process
    from .models.service import Service
    from .models.table import TableInfo
    from .models.user import User

    db = SessionLocal()
    try:
        actions = ["creation", "modification", "suppression", "rattachement", "detachement", "reorder"]

        # Activité des 14 derniers jours, par jour et par action.
        aujourdhui = datetime.utcnow().date()
        debut = aujourdhui - timedelta(days=13)
        lignes = (
            db.query(
                func.date(Historique.created_at).label("jour"),
                Historique.action,
                func.count().label("nb"),
            )
            .filter(Historique.created_at >= datetime.combine(debut, datetime.min.time()))
            .group_by("jour", Historique.action)
            .all()
        )
        par_jour: dict = {}
        for jour, action, nb in lignes:
            par_jour.setdefault(str(jour), {})[action] = nb
        activite_14j = []
        for i in range(14):
            jour = debut + timedelta(days=i)
            serie = par_jour.get(str(jour), {})
            activite_14j.append(
                {
                    "date": str(jour),
                    "total": sum(serie.values()),
                    **{a: serie.get(a, 0) for a in actions},
                }
            )

        # Répartition des événements par type d'entité.
        types = (
            db.query(Historique.type_entite, Historique.action, func.count().label("nb"))
            .group_by(Historique.type_entite, Historique.action)
            .all()
        )
        par_type: dict = {}
        for type_entite, action, nb in types:
            par_type.setdefault(type_entite, {"type_entite": type_entite, **{a: 0 for a in actions}, "total": 0})
            par_type[type_entite][action] = nb
            par_type[type_entite]["total"] += nb
        repartition_par_type = sorted(
            par_type.values(), key=lambda t: t["total"], reverse=True
        )

        # Top contributeurs (5 premiers utilisateurs).
        contributeurs = (
            db.query(User.id, User.name, func.count(Historique.id).label("nb"))
            .join(Historique, Historique.utilisateur_id == User.id)
            .group_by(User.id, User.name)
            .order_by(func.count(Historique.id).desc())
            .limit(5)
            .all()
        )
        top_contributeurs = [
            {"id": uid, "name": name, "nb": nb}
            for uid, name, nb in contributeurs
        ]

        # Derniers événements (pour la frise du tableau de bord).
        recents = (
            db.query(Historique)
            .order_by(Historique.created_at.desc(), Historique.id.desc())
            .limit(8)
            .all()
        )
        evenements_recents = [
            {
                "id": h.id,
                "utilisateur": {"id": h.utilisateur.id, "name": h.utilisateur.name}
                if h.utilisateur
                else None,
                "action": h.action,
                "type_entite": h.type_entite,
                "entite_id": h.entite_id,
                "nom_entite": h.nom_entite,
                "created_at": h.created_at,
            }
            for h in recents
        ]

        return {
            "domaines": db.query(Domaine).count(),
            "processes": db.query(Process).count(),
            "etapes": db.query(Etape).count(),
            "masques": db.query(Masque).count(),
            "fonctionnalites": db.query(Fonctionnalite).count(),
            "services": db.query(Service).count(),
            "procedures": db.query(ProcedureStockee).count(),
            "tables": db.query(TableInfo).count(),
            "attributs": db.query(Attribut).count(),
            "archives": db.query(Archive).count(),
            "utilisateurs": db.query(User).count(),
            "evenements": db.query(Historique).count(),
            "activite_14j": activite_14j,
            "repartition_par_type": repartition_par_type,
            "top_contributeurs": top_contributeurs,
            "evenements_recents": evenements_recents,
        }
    finally:
        db.close()
