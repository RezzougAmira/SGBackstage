from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from ..models.user import User
from ..utils.deps import get_current_user, require_writer
from ..utils.storage import delete_file, download_file, upload_file

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp"
]

MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/")
async def upload(file: UploadFile = File(...), _: User = Depends(require_writer)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type non autorisé: {file.content_type}. Utilisez PDF, PNG, JPEG, GIF ou WEBP."
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux: {len(content)} octets. Maximum: 10 MB."
        )

    try:
        key = upload_file(content, file.filename, file.content_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Échec de l'envoi vers le stockage: {exc}")

    return {
        "key": key,
        "type": file.content_type,
        "filename": file.filename
    }


@router.get("/{key}")
def get_file(key: str, _: User = Depends(get_current_user)):
    """Sert une image du bucket privé. Le bucket n'est jamais exposé publiquement."""
    if "/" in key or ".." in key:
        raise HTTPException(status_code=400, detail="Clé de fichier invalide")

    try:
        content, media_type = download_file(key)
    except Exception:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    return Response(content=content, media_type=media_type)


@router.delete("/")
def delete(key: str, _: User = Depends(require_writer)):
    try:
        success = delete_file(key)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    if not success:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression")
    return {"message": "Fichier supprimé"}
