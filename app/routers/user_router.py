from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.user_model import User
from db.session import get_db

router = APIRouter()

@router.get("/users")
async def get_all_users(db: AsyncSession = Depends(get_db)):
    """
    Returns a list of all users with their complete info including IDs.
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    if not users:
        raise HTTPException(status_code=404, detail="No users found")
    
    # Convert to dict for JSON response
    user_list = []
    for u in users:
        user_list.append({
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "age": u.age,
            "gender": u.gender,
            "bio": u.bio,
            "preference": u.preference,
            "relationship_status": u.relationship_status,
            "latitude": u.latitude,
            "longitude": u.longitude,
            "is_verified": u.is_verified,
            "premium_tier": u.premium_tier,
            "premium_expires_at": str(u.premium_expires_at) if u.premium_expires_at else None,
            "is_active": u.is_active,
            "is_profile_hidden": u.is_profile_hidden,
            "last_active": str(u.last_active),
            "created_at": str(u.created_at),
            "updated_at": str(u.updated_at)
        })
    
    return {"users": user_list}
