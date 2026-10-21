"""Limitation des tentatives de connexion (anti-force brute).

Un compte dont le mot de passe peut être testé des milliers de fois par
seconde finit toujours par tomber, même avec une politique de mot de passe
stricte. On compte donc les échecs par couple (adresse IP, email) et on
bloque temporairement au-delà d'un seuil.

Le stockage est en mémoire — volontairement : le projet tourne sur une
instance unique (Render), un cache distribué (Redis) serait une dépendance
supplémentaire pour un bénéfice nul ici. Le compteur se réinitialise au
redémarrage, ce qui reste acceptable : le but est de ralentir une attaque,
pas de tenir un registre permanent (le journal d'audit, lui, garde trace).
"""

from __future__ import annotations

import threading
import time

# Paramètres : au-delà de MAX_ECHECS échecs sur la fenêtre, on refuse
# pendant BLOCAGE_SECONDES, même si le mot de passe devient correct entre
# temps (sinon un attaquant pourrait « sonder » en attendant les fenêtres).
MAX_ECHECS = 5
FENETRE_SECONDES = 15 * 60  # 15 minutes
BLOCAGE_SECONDES = 15 * 60  # 15 minutes

_verrou = threading.Lock()
# clé -> (nombre d'échecs, date du dernier échec, date de fin de blocage)
_echecs: dict[str, tuple[int, float, float]] = {}


def _cle(ip: str, email: str) -> str:
    return f"{ip}|{email.strip().lower()}"


def est_bloque(ip: str, email: str) -> int:
    """Renvoie le nombre de secondes de blocage restantes, 0 si autorisé."""
    maintenant = time.monotonic()
    with _verrou:
        enregistrement = _echecs.get(_cle(ip, email))
        if enregistrement is None:
            return 0
        _, dernier, fin_blocage = enregistrement
        if maintenant - dernier > FENETRE_SECONDES:
            # Fenêtre expirée : on oublie l'historique.
            del _echecs[_cle(ip, email)]
            return 0
        if fin_blocage > maintenant:
            return int(fin_blocage - maintenant) + 1
        return 0


def enregistrer_echec(ip: str, email: str) -> int:
    """Compte un échec. Renvoie le blocage restant s'il vient d'être déclenché."""
    maintenant = time.monotonic()
    with _verrou:
        cle = _cle(ip, email)
        nombre, dernier, fin_blocage = _echecs.get(cle, (0, maintenant, 0.0))
        if maintenant - dernier > FENETRE_SECONDES:
            nombre = 0
        nombre += 1
        if nombre >= MAX_ECHECS:
            fin_blocage = maintenant + BLOCAGE_SECONDES
        _echecs[cle] = (nombre, maintenant, fin_blocage)
        return int(fin_blocage - maintenant) + 1 if fin_blocage > maintenant else 0


def reinitialiser(ip: str, email: str) -> None:
    """Connexion réussie : on efface le compteur de ce couple."""
    with _verrou:
        _echecs.pop(_cle(ip, email), None)


def reinitialiser_tout() -> None:
    """Utilisé par les tests pour repartir d'un état propre."""
    with _verrou:
        _echecs.clear()
