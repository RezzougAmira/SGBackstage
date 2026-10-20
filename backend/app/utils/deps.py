from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from .auth import TokenError, decode_access_token
from .roles import ROLES_ECRITURE, ROLES_SUPPRESSION, ROLE_ADMIN

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    # auto_error=False : on distingue « aucun token » (401) de « token refusé ».
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.reason,
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide : identifiant utilisateur absent"
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable : le compte a peut-être été supprimé"
        )
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Réserve une opération aux administrateurs.

    Les routes de gestion des comptes exposent la liste des utilisateurs ou
    permettent de modifier le rôle et le blocage : sans cette dépendance, un
    developer authentifié pourrait les appeler directement.
    """
    if current_user.role != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux administrateurs",
        )
    return current_user


async def require_writer(current_user: User = Depends(get_current_user)) -> User:
    """Autorise toute écriture : créer, modifier, rattacher, réordonner.

    Accessible à l'admin, à l'éditeur et au contributeur. Le contributeur est
    inclus car « modifier sans supprimer » reste un droit d'écriture.
    """
    if current_user.role not in ROLES_ECRITURE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action réservée aux contributeurs, éditeurs et administrateurs",
        )
    return current_user


async def require_deleter(current_user: User = Depends(get_current_user)) -> User:
    """Autorise la suppression d'une entité du référentiel.

    Réservée à l'admin et à l'éditeur : le contributeur ne peut pas supprimer.
    """
    if current_user.role not in ROLES_SUPPRESSION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La suppression est réservée aux éditeurs et administrateurs",
        )
    return current_user
