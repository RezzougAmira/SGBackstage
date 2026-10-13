"""Nom de fichier à télécharger : sans accents, sans caractères spéciaux."""

import re


def slug_fichier(nom: str) -> str:
    """Transforme un nom libre en nom de fichier URL-safe (ex. "Fiche Client")."""
    sans_accent = (nom or "").lower()
    for lettre in "àâäéèêëîïôöûüùçœ":
        sans_accent = sans_accent.replace(lettre, {
            "à": "a", "â": "a", "ä": "a", "é": "e", "è": "e", "ê": "e",
            "ë": "e", "î": "i", "ï": "i", "ô": "o", "ö": "o", "û": "u",
            "ü": "u", "ù": "u", "ç": "c", "œ": "oe",
        }[lettre])
    return re.sub(r"[^a-zA-Z0-9]+", "-", sans_accent).strip("-").lower() or "export"