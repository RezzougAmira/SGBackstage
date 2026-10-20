from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

from ..utils.roles import ROLE_CONTRIBUTOR, VALID_ROLES


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = ROLE_CONTRIBUTOR

    @field_validator("role")
    @classmethod
    def _valider_role(cls, value: Optional[str]) -> str:
        if value is None:
            return ROLE_CONTRIBUTOR
        if value not in VALID_ROLES:
            raise ValueError(
                "Rôle invalide : utilisez admin, editor ou contributor"
            )
        return value


class UserLogin(BaseModel):
    email: str
    password: str


class UserPasswordReset(BaseModel):
    """Nouveau mot de passe d'un compte, fixé par un administrateur."""

    password: str

    @field_validator("password")
    @classmethod
    def _valider_password(cls, value: str) -> str:
        value = value or ""
        if len(value) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return value


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    blocked: int = 0
    avatar_key: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Mise à jour de son propre profil. email/role/blocked sont volontairement
    absents : ils se gèrent côté administration, pas par l'utilisateur."""

    name: Optional[str] = None
    avatar_key: Optional[str] = None


class UserAdminUpdate(BaseModel):
    """Mise à jour d'un compte par un administrateur : là où l'utilisateur ne
    peut toucher qu'à son nom et sa photo, l'admin peut aussi changer l'email,
    le rôle et le statut."""

    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    blocked: Optional[int] = None
    # Clé d'une image déjà envoyée via POST /api/upload/ : elle permet à l'admin
    # de définir la photo d'un autre compte sans passer par un second endpoint.
    avatar_key: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
