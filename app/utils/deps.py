# app/utils/deps.py


from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from models.user_model import User
from utils.security import oauth2_scheme
from utils.config import settings
from sqlalchemy.future import select

ALGORITHM = settings.ALGORITHM

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user