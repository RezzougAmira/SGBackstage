from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Historique(Base):
    """Journal des changements.

    Chaque événement décrit qui, quand, sur quoi, et ce qui a changé : des
    captures JSON « avant » / « après » donnent le détail champ par champ.
    `nom_entite` conserve un libellé lisible même après la suppression de
    l'objet concerné (les suppressions sont dures en base).
    """

    __tablename__ = "historique"

    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action = Column(String(20), nullable=False)
    type_entite = Column(String(30), nullable=False)
    entite_id = Column(Integer, nullable=True)
    nom_entite = Column(String(255), nullable=True)
    avant = Column(JSON, nullable=True)
    apres = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    utilisateur = relationship("User")