# utils/premium_utils.py

from sqlalchemy.future import select
from models.user_model import User

async def is_premium_user(db, user_id: str) -> bool:
    result = await db.execute(select(User.premium_tier).where(User.id == user_id))
    tier = result.scalar_one_or_none()
    return tier and tier > 0
