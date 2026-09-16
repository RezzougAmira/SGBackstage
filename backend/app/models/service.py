from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    methode_http = Column(String(10), nullable=True)
    url = Column(String(500), nullable=True)
    input_desc = Column(String, nullable=True)
    output_desc = Column(String, nullable=True)
    controleur = Column(String(255), nullable=True)
    modifie_bdd = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    masques = relationship("MasqueService", back_populates="service", cascade="all, delete-orphan")
    procedures = relationship("ServiceProcedure", back_populates="service", cascade="all, delete-orphan")


class MasqueService(Base):
    __tablename__ = "masque_services"

    id = Column(Integer, primary_key=True)
    masque_id = Column(Integer, ForeignKey("masques.id", ondelete="CASCADE"))
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"))

    masque = relationship("Masque", back_populates="services")
    service = relationship("Service", back_populates="masques")
