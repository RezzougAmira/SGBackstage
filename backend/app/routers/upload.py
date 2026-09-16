from fastapi import APIRouter, UploadFile, File, HTTPException
from ..utils.storage import upload_file, delete_file

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
async def upload(file: UploadFile = File(...)):
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

    url = upload_file(content, file.filename, file.content_type)

    return {
        "url": url,
        "type": file.content_type,
        "filename": file.filename
    }


@router.delete("/")
async def delete(url: str):
    success = delete_file(url)
    if not success:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression")
    return {"message": "Fichier supprimé"}
