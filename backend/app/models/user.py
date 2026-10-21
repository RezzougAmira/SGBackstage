from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="contributor")
    blocked = Column(Integer, default=0)
    # Clé de l'image dans le bucket privé, pas une URL : le bucket n'est pas
    # public et l'URL signerait expire. L'image se récupère via /api/upload/.
    avatar_key = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
