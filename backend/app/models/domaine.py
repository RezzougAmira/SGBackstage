from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Domaine(Base):
    __tablename__ = "domaines"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    processes = relationship("Process", back_populates="domaine", cascade="all, delete-orphan")
