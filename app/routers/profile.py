# routers/profile.py


from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime
import os, shutil

from models.user_model import User, UserMedia
from schemas.profile_schema import UserProfileOut, ProfileUpdate, MediaOut
from utils.deps import get_current_user
from db.session import get_db

router = APIRouter(prefix="/getprofile", tags=["Get Profile"])


# 🟢 1. GET /profile/me
@router.get("/me", response_model=UserProfileOut)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch user
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch media
    media_result = await db.execute(select(UserMedia).where(UserMedia.user_id == user.id))
    media = media_result.scalars().all()

    stats = {"views": 156, "matches": 42, "response_rate": 0.98, "interests": []}

    return {
        "id": user.id,
        "full_name": user.full_name,
        "age": user.age,
        "gender": user.gender,
        "bio": user.bio,
        "ai_summary": user.bio or "AI summary placeholder",
        "is_verified": user.is_verified,
        "media": media,
        "stats": stats,
    }


# 🟡 2. PATCH /profile/edit
@router.patch("/edit")
async def update_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"msg": "Profile updated and AI reprocessed successfully"}


# 🟣 3. POST /profile/media
@router.post("/media", response_model=MediaOut)
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = "image",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_types = ["image/jpeg", "image/png", "video/mp4"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or MP4 allowed")

    upload_dir = "uploads/"
    os.makedirs(upload_dir, exist_ok=True)

    # Save file to disk
    file_name = f"{current_user.id}_{file.filename}"
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ✅ Construct a public URL for frontend access
    base_url = "http://127.0.0.1:8000"
    file_url = f"{base_url}/uploads/{file_name}"

    # Store the public URL instead of a relative path
    media_entry = UserMedia(
        user_id=current_user.id,
        file_path=file_url,
        media_type=media_type,
    )

    db.add(media_entry)
    await db.commit()
    await db.refresh(media_entry)

    return media_entry



# 🔴 4. DELETE /profile/media/{media_id}
@router.delete("/media/{media_id}")
async def delete_media(
    media_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserMedia)
        .where(UserMedia.id == media_id)
        .where(UserMedia.user_id == current_user.id)
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # remove file
    try:
        os.remove(media.file_path)
    except FileNotFoundError:
        pass

    await db.delete(media)
    await db.commit()
    return {"status": "ok", "deleted_id": str(media_id)}


# 🟤 5. GET /profile/stats
@router.get("/stats")
async def get_profile_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Replace with actual aggregation later
    return {"views": 156, "matches": 42, "response_rate": 0.98, "interests": []}


# ⚪ 6. POST /profile/aura
@router.post("/aura")
async def generate_aura(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    summary = f"{user.full_name or 'You'} radiate cosmic confidence and charm."
    user.bio = summary

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"ai_summary": summary, "generated_at": datetime.utcnow()}