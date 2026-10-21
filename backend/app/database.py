from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()

# pool_pre_ping : Supabase ferme les connexions restées inactives, ce qui
# valait un « server closed the connection unexpectedly » 500 au moment du
# premier appel suivant. Un ping avant chaque checkout évite ces erreurs.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency pour obtenir une session de base de données.

    En cas d'exception pendant la requête, la transaction est annulée : si
    une mutation a été faite sans être committée (parce que le commit est
    porté par l'écriture du journal, cf. utils/historique.py) et que
    l'écriture échoue, rien ne doit rester à moitié appliqué.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
