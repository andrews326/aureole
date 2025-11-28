# routers/media_router.py

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from services.media_service import handle_media_upload
from models.user_model import User
from utils.deps import get_current_user
from db.session import get_db


router = APIRouter(prefix="/chat/media", tags=["chat-media"])


@router.post("/upload")
async def upload_chat_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Basic validation
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Process and store media
    media = await handle_media_upload(db, file)

    # Attach uploader ID (important)
    media.uploader_id = current_user.id
    db.add(media)
    await db.commit()
    await db.refresh(media)

    return {
        "media_id": str(media.id),
        "url": media.file_path,       # /uploads/chat/<uuid>.jpg
        "thumb": media.thumb_path,    # /uploads/chat/<uuid>.jpg_thumb.jpg
        "kind": media.kind,
        "file_type": media.file_type,
        "width": media.width,
        "height": media.height,
        "duration_ms": media.duration_ms,
        "processed": True,
    }
