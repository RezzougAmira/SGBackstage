from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from ..config import get_settings

settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


class TokenError(Exception):
    """Token refusé, avec la cause exacte."""

    def __init__(self, reason: str, expired: bool = False):
        self.reason = reason
        self.expired = expired
        super().__init__(reason)


def decode_access_token(token: str) -> dict:
    """Décode un JWT et lève TokenError.

    Distingue un token expiré (cas normal, il suffit de se reconnecter) d'une
    signature invalide (cas anormal : JWT_SECRET différent de celui utilisé à
    l'émission). Sans cette distinction les deux remontent le même message.
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise TokenError(
            f"Token expiré (validité {settings.JWT_EXPIRATION_MINUTES} min). Reconnectez-vous.",
            expired=True,
        )
    except JWTError:
        raise TokenError(
            "Signature de token invalide : le JWT_SECRET du serveur a peut-être changé. "
            "Reconnectez-vous."
        )
