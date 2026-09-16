from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Archive(Base):
    __tablename__ = "archives"

    id = Column(Integer, primary_key=True, index=True)
    identifiant = Column(String(50), unique=True, nullable=False)
    date_push = Column(DateTime, default=datetime.utcnow)

    dcs = relationship("DC", back_populates="archive")
