from supabase import create_client
from ..config import get_settings
import uuid

settings = get_settings()

client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    unique_name = f"{uuid.uuid4()}.{ext}"

    client.storage.from_(settings.SUPABASE_BUCKET).upload(
        path=unique_name,
        file=file_bytes,
        file_options={"content-type": content_type}
    )

    url = client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(unique_name)
    return url


def delete_file(file_url: str) -> bool:
    try:
        path = file_url.split(f"/{settings.SUPABASE_BUCKET}/")[-1]
        client.storage.from_(settings.SUPABASE_BUCKET).remove([path])
        return True
    except Exception:
        return False
