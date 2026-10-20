"""Rôles applicatifs et droits associés.

Trois rôles seulement, du plus large au plus restreint :

- ``admin``       : tout, y compris la gestion des comptes utilisateurs.
- ``editor``      : créer, modifier et supprimer le référentiel.
- ``contributor`` : créer et modifier, mais jamais supprimer.

Le découpage repose sur un axe unique : écrire (créer/modifier) et, plus
dangereux, supprimer (la suppression déclenche des cascades et l'analyse
d'impact). Les constantes centralisées évitent que chaque route réinvente la
liste des rôles autorisés.
"""

ROLE_ADMIN = "admin"
ROLE_EDITOR = "editor"
ROLE_CONTRIBUTOR = "contributor"

VALID_ROLES = (ROLE_ADMIN, ROLE_EDITOR, ROLE_CONTRIBUTOR)

# Rôles autorisés à créer / modifier (et à rattacher, détacher, réordonner).
ROLES_ECRITURE = (ROLE_ADMIN, ROLE_EDITOR, ROLE_CONTRIBUTOR)

# Rôles autorisés à supprimer une entité du référentiel.
ROLES_SUPPRESSION = (ROLE_ADMIN, ROLE_EDITOR)

# Libellés lisibles, pour l'interface et la documentation.
ROLE_LABELS = {
    ROLE_ADMIN: "Administrateur",
    ROLE_EDITOR: "Développeur (modifie et supprime)",
    ROLE_CONTRIBUTOR: "Développeur (modifie sans supprimer)",
}


def est_role_valide(role: str | None) -> bool:
    return role in VALID_ROLES
