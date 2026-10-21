from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Fonctionnalite(Base):
    """Regroupement de services sous un masque.

    Le masque décrit la page technique d'un écran ; la fonctionnalité décrit,
    elle, ce que l'utilisateur peut faire (le bouton « Rechercher », par
    exemple). Une fonctionnalité peut appeler plusieurs services, et chaque
    service peut exposer plusieurs procédures stockées.
    """

    __tablename__ = "fonctionnalites"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    masque_id = Column(
        Integer, ForeignKey("masques.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ordre = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    masque = relationship("Masque", back_populates="fonctionnalites")
    services = relationship(
        "FonctionnaliteService", back_populates="fonctionnalite", cascade="all, delete-orphan"
    )


class FonctionnaliteService(Base):
    """Table de liaisonmany-to-many : une fonctionnalité peut appeler plusieurs
    services, et un même service peut être réutilisé par d'autres
    fonctionnalités sans être dupliqué."""

    __tablename__ = "fonctionnalite_services"

    id = Column(Integer, primary_key=True)
    fonctionnalite_id = Column(
        Integer, ForeignKey("fonctionnalites.id", ondelete="CASCADE"), index=True
    )
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), index=True)

    fonctionnalite = relationship("Fonctionnalite", back_populates="services")
    service = relationship("Service", back_populates="fonctionnalites")
