# router/profile_router_04.py


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from sqlalchemy import select

from db.session import get_db
from models.user_model import User
from utils.deps import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile Location"])


class LocationUpdate(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    share_location: Optional[bool] = True  # ✅ new flag — user can disable sharing


@router.post("/location")
async def update_location(
    payload: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user_id: UUID = current_user.id

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # --- Handle location sharing preference ---
    if payload.share_location is False:
        user.latitude = None
        user.longitude = None
        await db.commit()
        return {"msg": "Location sharing disabled"}

    # --- Update if coords provided ---
    if payload.latitude is not None and payload.longitude is not None:
        user.latitude = payload.latitude
        user.longitude = payload.longitude
        await db.commit()
        return {
            "msg": "Location updated successfully",
            "latitude": user.latitude,
            "longitude": user.longitude
        }

    raise HTTPException(status_code=400, detail="No coordinates provided")