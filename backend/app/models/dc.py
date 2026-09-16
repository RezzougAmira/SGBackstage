from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class DC(Base):
    __tablename__ = "dcs"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(50), unique=True, nullable=False)
    titre = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    auteur_id = Column(Integer, ForeignKey("users.id"))
    etape_id = Column(Integer, ForeignKey("etapes.id"))
    archive_id = Column(Integer, ForeignKey("archives.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    auteur = relationship("User", back_populates="dcs")
    etape = relationship("Etape")
    archive = relationship("Archive", back_populates="dcs")
    masques = relationship("DCMasque", back_populates="dc", cascade="all, delete-orphan")
    services = relationship("DCService", back_populates="dc", cascade="all, delete-orphan")
    procedures = relationship("DCProcedure", back_populates="dc", cascade="all, delete-orphan")
    tables = relationship("DCTable", back_populates="dc", cascade="all, delete-orphan")
    attributs = relationship("DCAttribut", back_populates="dc", cascade="all, delete-orphan")


class DCMasque(Base):
    __tablename__ = "dc_masques"

    id = Column(Integer, primary_key=True)
    dc_id = Column(Integer, ForeignKey("dcs.id", ondelete="CASCADE"))
    masque_id = Column(Integer, ForeignKey("masques.id", ondelete="CASCADE"))
    action = Column(String(50), nullable=False)
    details = Column(String, nullable=True)

    dc = relationship("DC", back_populates="masques")
    masque = relationship("Masque")


class DCService(Base):
    __tablename__ = "dc_services"

    id = Column(Integer, primary_key=True)
    dc_id = Column(Integer, ForeignKey("dcs.id", ondelete="CASCADE"))
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"))
    action = Column(String(50), nullable=False)
    details = Column(String, nullable=True)

    dc = relationship("DC", back_populates="services")
    service = relationship("Service")


class DCProcedure(Base):
    __tablename__ = "dc_procedures"

    id = Column(Integer, primary_key=True)
    dc_id = Column(Integer, ForeignKey("dcs.id", ondelete="CASCADE"))
    procedure_id = Column(Integer, ForeignKey("procedures_stockees.id", ondelete="CASCADE"))
    action = Column(String(50), nullable=False)
    details = Column(String, nullable=True)

    dc = relationship("DC", back_populates="procedures")
    procedure = relationship("ProcedureStockee")


class DCTable(Base):
    __tablename__ = "dc_tables"

    id = Column(Integer, primary_key=True)
    dc_id = Column(Integer, ForeignKey("dcs.id", ondelete="CASCADE"))
    table_id = Column(Integer, ForeignKey("tables_info.id", ondelete="CASCADE"))
    action = Column(String(50), nullable=False)
    details = Column(String, nullable=True)

    dc = relationship("DC", back_populates="tables")
    table = relationship("TableInfo")


class DCAttribut(Base):
    __tablename__ = "dc_attributs"

    id = Column(Integer, primary_key=True)
    dc_id = Column(Integer, ForeignKey("dcs.id", ondelete="CASCADE"))
    attribut_id = Column(Integer, ForeignKey("attributs.id", ondelete="CASCADE"))
    action = Column(String(50), nullable=False)
    details = Column(String, nullable=True)

    dc = relationship("DC", back_populates="attributs")
    attribut = relationship("Attribut")
