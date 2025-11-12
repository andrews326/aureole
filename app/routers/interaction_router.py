# routers/interaction.py


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from services.match_service import (
    record_view, record_swipe, record_like,
    undo_last_swipe, undo_like, unmatch_user,
    get_user_matches
)
from db.session import get_db
from utils.deps import get_current_user  # adjust import if needed

router = APIRouter(prefix="/interactions", tags=["Interactions"])


@router.get("/")
async def list_matches(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    matches = await get_user_matches(db, current_user.id)
    return {"status": "ok", "matches": matches}

# ---------------------------
# 1️⃣ View Profile
# ---------------------------
@router.post("/view/{target_id}")
async def view_user_profile(
    target_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Record that the current user viewed another profile.
    Sends a 'view' notification to the viewed user.
    """
    result = await record_view(db, viewer_id=current_user.id, viewed_id=str(target_id))
    return {"status": "ok", "data": result}


# ---------------------------
# 2️⃣ Swipe (Right/Left)
# ---------------------------
@router.post("/swipe/{target_id}")
async def swipe_user(
    target_id: UUID,
    liked: bool,  # true = right swipe, false = left swipe
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Record a swipe (right or left).  
    - liked=True: sends 'swipe_like' notification  
    - if mutual: creates a Match + 'match' notifications
    """
    result = await record_swipe(db, swiper_id=current_user.id, swiped_id=str(target_id), liked=liked)
    return {"status": "ok", "data": result}


# ---------------------------
# 3️⃣ Explicit Like
# ---------------------------
@router.post("/like/{target_id}")
async def like_user(
    target_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Record an explicit 'like' (separate from swiping).  
    Sends 'like' notification and checks for mutual like/match.
    """
    result = await record_like(db, liker_id=current_user.id, liked_id=str(target_id))
    return {"status": "ok", "data": result}


# ---------------------------
# 4️⃣ Undo Last Swipe (Rewind)
# ---------------------------
@router.post("/undo/swipe")
async def undo_swipe(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Rewinds the last swipe made by the current user.
    Marks the swipe record as undone.
    """
    result = await undo_last_swipe(db, user_id=current_user.id)
    return {"status": "ok", "data": result}


# ---------------------------
# 5️⃣ Undo Like
# ---------------------------
@router.post("/undo/like/{target_id}")
async def undo_user_like(
    target_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Removes a like given to a target user (if any).
    """
    result = await undo_like(db, liker_id=current_user.id, liked_id=str(target_id))
    return {"status": "ok", "data": result}


# ---------------------------
# 6️⃣ Unmatch User
# ---------------------------
@router.post("/unmatch/{target_id}")
async def unmatch_user_route(
    target_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Ends a mutual match between two users.
    Sends 'unmatch' notification to the other user.
    """
    result = await unmatch_user(db, user_id=current_user.id, target_id=str(target_id))
    return {"status": "ok", "data": result}
