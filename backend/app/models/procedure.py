from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class ProcedureStockee(Base):
    __tablename__ = "procedures_stockees"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    services = relationship("ServiceProcedure", back_populates="procedure", cascade="all, delete-orphan")
    tables = relationship("ProcedureTable", back_populates="procedure", cascade="all, delete-orphan")


class ServiceProcedure(Base):
    __tablename__ = "service_procedures"

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), index=True)
    procedure_id = Column(Integer, ForeignKey("procedures_stockees.id", ondelete="CASCADE"), index=True)

    service = relationship("Service", back_populates="procedures")
    procedure = relationship("ProcedureStockee", back_populates="services")
