# services/media_service.py


import uuid
import os
import aiofiles
import ffmpeg
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession
from models.message_model import ChatMedia
from fastapi import UploadFile
from utils.config import settings

UPLOAD_DIR = "uploads/chat"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_upload_file(file: UploadFile) -> str:
    """
    Saves uploaded file to /uploads/chat/<uuid>.<ext>
    Returns the full path.
    """
    ext = os.path.splitext(file.filename)[1] or ""
    media_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{media_id}{ext}")

    async with aiofiles.open(file_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)

    return file_path, media_id, ext


def get_media_kind(mime: str) -> str:
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    return "file"


def extract_image_metadata(path: str):
    with Image.open(path) as img:
        return img.width, img.height


def extract_video_metadata(path: str):
    try:
        probe = ffmpeg.probe(path)
        v = next(s for s in probe["streams"] if s["codec_type"] == "video")
        width = int(v["width"])
        height = int(v["height"])
        duration = float(probe["format"]["duration"]) * 1000
        return width, height, int(duration)
    except Exception:
        return None, None, None


def generate_video_thumbnail(path: str, thumb_path: str):
    try:
        (
            ffmpeg
            .input(path, ss=0)
            .filter("scale", 320, -1)
            .output(thumb_path, vframes=1)
            .run(quiet=True)
        )
        return True
    except Exception:
        return False


def generate_image_thumbnail(path: str, thumb_path: str):
    try:
        with Image.open(path) as img:
            img.thumbnail((320, 320))
            img.save(thumb_path)
        return True
    except Exception:
        return False



async def handle_media_upload(db: AsyncSession, file: UploadFile) -> ChatMedia:
    file_path, media_id, ext = await save_upload_file(file)

    # FIX: Preserve full MIME including codecs (important for audio)
    mime = file.headers.get("content-type") or file.content_type

    kind = get_media_kind(mime)

    thumb_path = None
    width = None
    height = None
    duration_ms = None

    if kind == "image":
        width, height = extract_image_metadata(file_path)
        thumb_path = f"{file_path}_thumb.jpg"
        generate_image_thumbnail(file_path, thumb_path)

    elif kind == "video":
        width, height, duration_ms = extract_video_metadata(file_path)
        thumb_path = f"{file_path}_thumb.jpg"
        generate_video_thumbnail(file_path, thumb_path)

    elif kind == "audio":
        try:
            probe = ffmpeg.probe(file_path)
            duration_sec = float(probe["format"]["duration"])
            duration_ms = int(duration_sec * 1000)
        except Exception:
            duration_ms = None

    # Build ChatMedia row
    media = ChatMedia(
        id=media_id,
        uploader_id=None,
        file_path=file_path.replace("uploads", "/uploads"),
        file_name=file.filename,
        file_type=mime,   # FIXED – now includes codecs
        kind=kind,
        size_bytes=os.path.getsize(file_path),
        width=width,
        height=height,
        duration_ms=duration_ms,
        thumb_path=thumb_path.replace("uploads", "/uploads") if thumb_path else None,
        processed=True,
    )

    db.add(media)
    return media