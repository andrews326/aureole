# routers/profile_router_02.py


from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
import shutil
import os
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from utils.deps import get_current_user
from models.user_model import VerificationAttempt, UserMedia

router = APIRouter(prefix="/profile", tags=["Profile Verification"])

UPLOAD_DIR = "uploads/verification_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)



@router.post("/verify-photo")
async def upload_media(
    file: UploadFile = File(...),
    is_verification: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "video/mp4"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or MP4 allowed")

    # Determine media type
    media_type = "video" if file.content_type.startswith("video/") else "image"

    # Build filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else "jpg"
    filename = f"{current_user.id}_{uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ✅ Only create VerificationAttempt if it's a verification upload
    if is_verification:
        attempt = VerificationAttempt(
            user_id=current_user.id,
            photo_path=file_path,
            status="pending",
        )
        db.add(attempt)  # ← ✅ add to session

        # ✅ Mark verified instantly (optional)
        current_user.is_verified = True

        # ✅ Set as profile photo
        current_user.profile_photo = file_path


    # Create media record
    media = UserMedia(
        user_id=current_user.id,
        file_path=file_path,
        media_type=media_type,
        is_verified=is_verification
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    return {
        "msg": "Media uploaded",
        "media_id": str(media.id),
        "is_verified": is_verification,
        "media_type": media_type
    }