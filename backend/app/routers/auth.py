from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    UserAdminUpdate,
    Token,
)
from ..utils.auth import get_password_hash, verify_password, create_access_token
from ..utils.deps import get_current_user, require_admin
from ..utils.historique import enregistrer_historique, snapshot

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Le mot de passe ne doit jamais se retrouver dans le journal.
SANS_PASSWORD = frozenset({"password"})


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Retourne l'utilisateur du token. Sert aussi à vérifier qu'un token
    enregistré dans le navigateur est encore valide au chargement de l'app."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Met à jour le profil de l'utilisateur connecté.

    Seul l'utilisateur lui-même peut modifier son propre profil : on travaille
    sur current_user, jamais sur un id fourni par le client.
    """
    donnees = payload.model_dump(exclude_unset=True)

    if "name" in donnees:
        nouveau_nom = (donnees["name"] or "").strip()
        if not nouveau_nom:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Le nom ne peut pas être vide",
            )
        current_user.name = nouveau_nom

    if "avatar_key" in donnees:
        current_user.avatar_key = donnees["avatar_key"] or None

    avant = snapshot(current_user, SANS_PASSWORD)
    db.commit()
    db.refresh(current_user)
    enregistrer_historique(
        db, utilisateur=current_user, action="modification", type_entite="user",
        entite_id=current_user.id, nom_entite=current_user.name,
        avant=avant, apres=snapshot(current_user, SANS_PASSWORD),
    )
    return current_user


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )

    # Créer l'utilisateur
    db_user = User(
        email=user.email,
        password=get_password_hash(user.password),
        name=user.name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    enregistrer_historique(
        db, utilisateur=None, action="creation", type_entite="user",
        entite_id=db_user.id, nom_entite=db_user.name,
        apres=snapshot(db_user, SANS_PASSWORD),
    )
    return db_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).all()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )

    db_user = User(
        email=user.email,
        password=get_password_hash(user.password),
        name=user.name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    enregistrer_historique(
        db, utilisateur=admin, action="creation", type_entite="user",
        entite_id=db_user.id, nom_entite=db_user.name,
        apres=snapshot(db_user, SANS_PASSWORD),
    )
    return db_user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user_by_admin(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Mise à jour complète d'un compte par un administrateur.

    Réservée aux admins : c'est le pendant de PATCH /api/auth/me, qui ne touche
    qu'au profil de l'utilisateur connecté.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    donnees = payload.model_dump(exclude_unset=True)

    if "name" in donnees:
        nouveau_nom = (donnees["name"] or "").strip()
        if not nouveau_nom:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Le nom ne peut pas être vide",
            )
        user.name = nouveau_nom

    if "email" in donnees:
        nouvel_email = (donnees["email"] or "").strip().lower()
        if not nouvel_email or "@" not in nouvel_email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email invalide",
            )
        # L'email est unique : on refuse si un autre compte le porte déjà.
        doublon = (
            db.query(User)
            .filter(User.email == nouvel_email, User.id != user.id)
            .first()
        )
        if doublon:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet email est déjà utilisé",
            )
        user.email = nouvel_email

    if "role" in donnees and donnees["role"]:
        if donnees["role"] not in ("admin", "developer"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Rôle invalide : utilisez admin ou developer",
            )
        # Se dégrader soi-même d'admin à developer retirerait au compte le
        # contrôle des utilisateurs : on l'interdit.
        if user.id == admin.id and donnees["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas retirer votre propre rôle d'administrateur",
            )
        user.role = donnees["role"]

    if "avatar_key" in donnees:
        cle = donnees["avatar_key"]
        if cle is None or cle == "":
            user.avatar_key = None
        else:
            # La clé vient du client : on refuse toute tentative de sortie du
            # dossier de fichiers (chemin absolu, remontée de dossier, etc.).
            if "/" in cle or "\\" in cle or ".." in cle:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Clé de photo invalide",
                )
            user.avatar_key = cle

    if "blocked" in donnees:
        if user.id == admin.id and donnees["blocked"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas bloquer votre propre compte",
            )
        user.blocked = 1 if donnees["blocked"] else 0

    avant = snapshot(user, SANS_PASSWORD)
    db.commit()
    db.refresh(user)
    enregistrer_historique(
        db, utilisateur=admin, action="modification", type_entite="user",
        entite_id=user.id, nom_entite=user.name,
        avant=avant, apres=snapshot(user, SANS_PASSWORD),
    )
    return user


@router.post("/users/{user_id}/block", response_model=UserResponse)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    # Un admin ne doit pas pouvoir se verrouiller lui-même hors de l'app.
    if user.id == admin.id:
        raise HTTPException(
            status_code=400, detail="Vous ne pouvez pas bloquer votre propre compte"
        )
    user.blocked = 1
    avant = snapshot(user, SANS_PASSWORD)
    db.commit()
    db.refresh(user)
    enregistrer_historique(
        db, utilisateur=admin, action="modification", type_entite="user",
        entite_id=user.id, nom_entite=user.name,
        avant=avant, apres=snapshot(user, SANS_PASSWORD),
    )
    return user


@router.post("/users/{user_id}/unblock", response_model=UserResponse)
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user.blocked = 0
    avant = snapshot(user, SANS_PASSWORD)
    db.commit()
    db.refresh(user)
    enregistrer_historique(
        db, utilisateur=admin, action="modification", type_entite="user",
        entite_id=user.id, nom_entite=user.name,
        avant=avant, apres=snapshot(user, SANS_PASSWORD),
    )
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    # Chercher l'utilisateur
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )

    # Vérifier le mot de passe
    if not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )

    # Créer le token
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )
