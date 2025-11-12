# services/auth_service.py


from sqlalchemy.ext.asyncio import AsyncSession
from models.user_model import User
from schemas.user_schema import UserCreate
from utils.security import get_password_hash, verify_password
from sqlalchemy.future import select

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, user_in: UserCreate):
    hashed_pw = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=hashed_pw,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def authenticate_user(db: AsyncSession, email: str, password: str):
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user