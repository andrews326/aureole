# /routers/auth_routers.py


from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from schemas.user_schema import UserCreate, UserOut, Token
from services.auth_service import create_user, authenticate_user
from utils.security import create_access_token
from utils. deps import get_current_user
from models.user_model import User
from models.profile_model import Profile
from db.session import get_db

router = APIRouter()

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = await create_user(db, user_in)
    return {"msg": "User created", "user_id": str(db_user.id)}

@router.post("/login", response_model=Token)
async def login(
    username: str = Form(...),    # ← Swagger sends "username"
    password: str = Form(...),    # ← and "password"
    db: AsyncSession = Depends(get_db)
):
    # Treat "username" as email
    user = await authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    access_token = create_access_token(data={"user_id": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout_all")
async def logout_all(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # increment token_version → invalidates ALL previous tokens instantly
    current_user.token_version += 1

    db.add(current_user)
    await db.commit()

    return {"msg": "all sessions invalidated"}


@router.get("/profile/me")
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    
    if profile:
        # Only return serializable fields
        return {
            "exists": True,
            "raw_prompts": profile.raw_prompts,
            "ai_summary": profile.ai_summary,
            "preferences": profile.preferences,
        }
    
    return {"exists": False}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user



@router.get("/profile/status")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Profile.user_id).where(Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    # Only return profile existence
    return {"exists": bool(profile)}

