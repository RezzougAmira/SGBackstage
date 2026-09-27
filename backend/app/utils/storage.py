from supabase import create_client
from ..config import get_settings
import base64
import json
import uuid

settings = get_settings()


def _jwt_role(key: str) -> str | None:
    """Rôle porté par le claim 'role' d'une clé JWT Supabase, ou None si absent."""
    parts = key.split(".")
    if len(parts) != 3:
        return None
    payload = parts[1]
    payload += "=" * (-len(payload) % 4)
    try:
        claims = json.loads(base64.urlsafe_b64decode(payload))
    except (ValueError, TypeError):
        return None
    role = claims.get("role")
    return role if isinstance(role, str) else None


def _check_key_level() -> None:
    """Refuse une clé publique : elle est soumise aux RLS et l'upload échoue en 403.

    Les clés service_role sont elles aussi des JWT : c'est le claim "role" qui
    distingue une clé publique d'une clé serveur, pas la simple présence de JWT.
    """
    key = settings.SUPABASE_KEY
    if not key:
        raise RuntimeError("SUPABASE_KEY est vide dans le fichier .env.")

    if key.startswith("sb_publishable_"):
        # Les nouvelles clés publishables n'ont pas de claim role lisible.
        raise RuntimeError(
            "SUPABASE_KEY est une clé publishable (sb_publishable_...) : elle subit les RLS "
            "et l'upload échoue avec un 403 'new row violates row-level security policy'. "
            "Remplacez-la par la clé service_role (Dashboard > Settings > API > service_role)."
        )

    role = _jwt_role(key)
    if role == "anon":
        raise RuntimeError(
            "SUPABASE_KEY est une clé anon (role=anon) : elle subit les RLS et l'upload "
            "échoue avec un 403 'new row violates row-level security policy'. "
            "Remplacez-la par la clé service_role (Dashboard > Settings > API > service_role)."
        )


client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


CONTENT_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
}


def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Envoie un fichier et retourne sa clé de stockage (pas une URL publique)."""
    _check_key_level()

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    key = f"{uuid.uuid4()}.{ext}"

    client.storage.from_(settings.SUPABASE_BUCKET).upload(
        path=key,
        file=file_bytes,
        file_options={"content-type": content_type}
    )
    return key


def download_file(key: str) -> tuple[bytes, str]:
    """Relit un fichier depuis le bucket privé. Retourne (octets, content-type)."""
    _check_key_level()

    data = client.storage.from_(settings.SUPABASE_BUCKET).download(key)
    if isinstance(data, tuple):
        data = data[1]

    ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
    return data, CONTENT_TYPES.get(ext, "application/octet-stream")


def delete_file(key: str) -> bool:
    _check_key_level()

    try:
        client.storage.from_(settings.SUPABASE_BUCKET).remove([key])
        return True
    except Exception:
        return False
