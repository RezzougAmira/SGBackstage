from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Masque(Base):
    __tablename__ = "masques"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    nom = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    image_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    etapes = relationship("EtapeMasque", back_populates="masque", cascade="all, delete-orphan")
    services = relationship("MasqueService", back_populates="masque", cascade="all, delete-orphan")
    fonctionnalites = relationship(
        "Fonctionnalite", back_populates="masque", cascade="all, delete-orphan"
    )


class EtapeMasque(Base):
    __tablename__ = "etape_masques"

    id = Column(Integer, primary_key=True)
    etape_id = Column(Integer, ForeignKey("etapes.id", ondelete="CASCADE"), index=True)
    masque_id = Column(Integer, ForeignKey("masques.id", ondelete="CASCADE"), index=True)

    etape = relationship("Etape", back_populates="masques")
    masque = relationship("Masque", back_populates="etapes")
