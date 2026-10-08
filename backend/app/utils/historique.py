"""Journalisation des changements : le journal « historique ».

Chaque mutation d'un objet enregistre une entrée avec l'auteur (utilisateur
connecté), l'action (création, modification, suppression, rattachement,
détachement) et une capture JSON avant/après pour un diff détaillé.
"""

from datetime import date, datetime
from typing import Any, Dict, FrozenSet, Optional

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from ..models.historique import Historique
from ..models.user import User


def snapshot(obj: Any, exclure: FrozenSet[str] = frozenset()) -> Optional[Dict[str, Any]]:
    """Copie les colonnes d'un objet modèle en dictionnaire JSON simple.

    Les dates sont converties en ISO, les colonnes listées dans `exclure`
    (ex. le mot de passe d'un utilisateur) sont ignorées.
    """
    if obj is None:
        return None

    mapper = inspect(obj.__class__)
    data: Dict[str, Any] = {}
    for column in mapper.columns:
        key = column.key
        if key in exclure or key.startswith("_"):
            continue
        value = getattr(obj, key)
        if isinstance(value, (datetime, date)):
            value = value.isoformat()
        data[key] = value
    return data


def diff(avant: Optional[Dict[str, Any]], apres: Optional[Dict[str, Any]]) -> Dict[str, list]:
    """Liste les champs qui ont changé entre deux captures.

    Retourne {champ: [ancienne_valeur, nouvelle_valeur]}. Champ absent d'une
    des deux captures = création de valeur (None → « absent »).
    """
    if not isinstance(avant, dict) or not isinstance(apres, dict):
        return {}

    modifications: Dict[str, list] = {}
    for cle in set(avant.keys()) | set(apres.keys()):
        ancien = avant.get(cle)
        nouveau = apres.get(cle)
        if ancien != nouveau:
            modifications[cle] = [ancien, nouveau]
    return modifications


def enregistrer_historique(
    db: Session,
    *,
    utilisateur: Optional[User],
    action: str,
    type_entite: str,
    entite_id: Optional[int],
    nom_entite: Optional[str] = None,
    avant: Optional[Dict[str, Any]] = None,
    apres: Optional[Dict[str, Any]] = None,
) -> None:
    """Ajoute une entrée au journal et la commite.

    Appelée APRÈS l'opération métier (l'objet est déjà persisté ou supprimé) :
    chaque action du journal vit ainsi dans sa propre transaction, à la suite.
    """
    db.add(
        Historique(
            utilisateur_id=utilisateur.id if utilisateur else None,
            action=action,
            type_entite=type_entite,
            entite_id=entite_id,
            nom_entite=nom_entite,
            avant=avant,
            apres=apres,
        )
    )
    db.commit()