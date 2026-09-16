from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Attribut(Base):
    __tablename__ = "attributs"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    table_id = Column(Integer, ForeignKey("tables_info.id", ondelete="CASCADE"), nullable=False)

    table = relationship("TableInfo", back_populates="attributs")
