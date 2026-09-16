from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Process(Base):
    __tablename__ = "processes"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    diagramme_url = Column(String, nullable=True)
    diagramme_type = Column(String, nullable=True)
    domaine_id = Column(Integer, ForeignKey("domaines.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    domaine = relationship("Domaine", back_populates="processes")
    etapes = relationship("Etape", back_populates="process", cascade="all, delete-orphan")
