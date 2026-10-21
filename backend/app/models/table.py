from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class TableInfo(Base):
    __tablename__ = "tables_info"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    base_donnees = Column(String(255), nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attributs = relationship("Attribut", back_populates="table", cascade="all, delete-orphan")
    procedures = relationship("ProcedureTable", back_populates="table", cascade="all, delete-orphan")


class ProcedureTable(Base):
    __tablename__ = "procedure_tables"

    id = Column(Integer, primary_key=True)
    procedure_id = Column(Integer, ForeignKey("procedures_stockees.id", ondelete="CASCADE"), index=True)
    table_id = Column(Integer, ForeignKey("tables_info.id", ondelete="CASCADE"), index=True)

    procedure = relationship("ProcedureStockee", back_populates="tables")
    table = relationship("TableInfo", back_populates="procedures")
