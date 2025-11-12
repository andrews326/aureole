# router/profile_router_01.py


from fastapi import (
    APIRouter, Depends, HTTPException, 
    status, Body, Query
    )
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from db.session import get_db
from models.profile_model import Profile
from models.user_model import User
from utils.deps import get_current_user
from datetime import datetime, timedelta, timezone
from services.ai_service import run_ai_profile_process
from uuid import UUID

router = APIRouter(prefix="/profile", tags=["Profile Setup"])

# --- Predefined Options ---
GENDER_OPTIONS = ["male", "female", "non-binary", "transgender", "other"]
BIO_OPTIONS = [
    "adventurous", "creative", "intellectual", "humorous",
    "ambitious", "introvert", "extrovert", "empathetic"
]
PREFERENCE_OPTIONS = ["straight", "gay", "bisexual", "asexual", "pansexual", "queer", "other"]
RELATIONSHIP_OPTIONS = ["single", "in a relationship", "married", "divorced", "complicated"]

# --- Schema ---
class ProfileSetupRequest(BaseModel):
    full_name: str
    age: int
    gender: str
    bio: str
    preference: str
    relationship_status: str
    about: str
    looking_for: str
    interests: list[str]
    dealbreakers: list[str]
    
    # Optional location fields
    latitude: float | None = None
    longitude: float | None = None
    share_location: bool = True  # user toggle


# --- Route ---

# --- Route ---
@router.post("/setup")
async def setup_profile(
    payload: ProfileSetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def validate_option(field_value: str, allowed: List[str]) -> str:
        normalized = field_value.strip().lower()
        if normalized in allowed:
            return normalized
        return field_value.strip()

    # --- Prevent duplicate setup ---
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    existing_profile = result.scalar_one_or_none()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already set up. Updates not allowed.")


    # --- Update user basic info (one-time) ---
    current_user.full_name = payload.full_name
    current_user.age = payload.age
    current_user.gender = validate_option(payload.gender, GENDER_OPTIONS)
    current_user.bio = validate_option(payload.bio, BIO_OPTIONS)
    current_user.preference = validate_option(payload.preference, PREFERENCE_OPTIONS)
    current_user.relationship_status = validate_option(payload.relationship_status, RELATIONSHIP_OPTIONS)

    # --- Create profile ---
    raw_prompts = {
        "about": payload.about,
        "looking_for": payload.looking_for,
        "interests": payload.interests,
        "dealbreakers": payload.dealbreakers,
    }

    profile = Profile(user_id=current_user.id, raw_prompts=raw_prompts)
    db.add(profile)

    # --- Commit both user and profile ---
    await db.commit()

    # --- Trigger AI summarization ---
    ai_result = await run_ai_profile_process(db, current_user)

    return {
        "msg": "Profile setup complete and AI summary generated",
        "summary": ai_result["summary"],
        "preferences": ai_result["preferences"],
    }


@router.patch("/edit")
async def edit_profile(
    updates: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # --- Cooldown: 3 days (72 hours) ---
    if profile.last_edited_at:
        time_since_edit = datetime.now(timezone.utc) - profile.last_edited_at
        if time_since_edit < timedelta(days=3):
            remaining = timedelta(days=3) - time_since_edit
            hours_left = int(remaining.total_seconds() // 3600)
            raise HTTPException(
                status_code=403,
                detail=f"Profile editing is locked. Try again in {hours_left} hours."
            )

    # --- Editable fields ---
    editable_user_fields = {
        "full_name", "age", "gender", "bio", "preference", "relationship_status"
    }
    editable_profile_fields = {
        "about", "looking_for", "interests", "dealbreakers"
    }

    # --- Update user info ---
    for field, value in updates.items():
        if field in editable_user_fields:
            setattr(current_user, field, value)

    # --- Update profile details ---
    raw_prompts = profile.raw_prompts or {}
    for field, value in updates.items():
        if field in editable_profile_fields:
            raw_prompts[field] = value
    profile.raw_prompts = raw_prompts

    # --- Update timestamp ---
    profile.last_edited_at = datetime.now(timezone.utc)

    await db.commit()

    # --- Run AI reprocess only if edit was successful ---
    try:
        await run_ai_profile_process(db=db, current_user=current_user)
    except Exception as e:
        # Non-fatal — don’t block the edit
        print(f"[AI REPROCESS WARNING] Failed to regenerate summary: {e}")

    return {"msg": "Profile updated and AI reprocessed successfully"}



@router.delete("/delete")
async def delete_profile_field(
    field: str = Query(..., description="Field to delete, or 'all' to reset profile"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user_fields = {
        "full_name", "age", "gender", "bio", "preference", "relationship_status"
    }
    profile_fields = {
        "about", "looking_for", "interests", "dealbreakers"
    }

    # --- Get profile ---
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # --- Cooldown: 3 days between destructive actions ---
    if profile.last_edited_at:
        since_edit = datetime.now(timezone.utc) - profile.last_edited_at
        if since_edit < timedelta(days=3):
            remaining = timedelta(days=3) - since_edit
            hours_left = int(remaining.total_seconds() // 3600)
            raise HTTPException(
                status_code=403,
                detail=f"Profile delete is locked. Try again in {hours_left} hours."
            )

    # --- Handle full deletion ---
    if field == "all":
        await db.delete(profile)
        for attr in user_fields:
            setattr(current_user, attr, None)
        await db.commit()
        return {"msg": "Profile and user details cleared"}

    # --- Handle field-specific deletion ---
    if field in user_fields:
        setattr(current_user, field, None)
    elif field in profile_fields:
        raw_prompts = profile.raw_prompts or {}
        raw_prompts.pop(field, None)
        profile.raw_prompts = raw_prompts
    else:
        raise HTTPException(status_code=400, detail="Invalid field name")

    # --- Update edit timestamp ---
    profile.last_edited_at = datetime.now(timezone.utc)
    await db.commit()

    # --- 🔥 Trigger AI reprocess (after delete) ---
    try:
        await run_ai_profile_process(db, current_user)
    except Exception as e:
        # Log, don’t block
        print(f"[AI REPROCESS WARNING] Failed after delete: {e}")

    return {"msg": f"{field} removed and AI summary updated"}