# routers/interaction.py


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from sqlalchemy import select,delete
from services.match_service import create_match
from models.user_model import Notification, User
from models.match_model import Match, Swipe
from models.block_model import UserBlock
from services.notification_service import (
    record_swipe, undo_last_swipe, undo_like, unmatch_user,
    )
from services.match_service import(
    record_view,record_like,get_user_matches
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


@router.post("/swipe/accept/{swiper_id}")
async def accept_swipe(
    swiper_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Current user accepts a swipe request from swiper_id -> create mutual match.
    """
    swiper_id_str = str(swiper_id)
    recipient_id = str(current_user.id)

    # ensure there is an existing swipe request from swiper -> recipient
    swipe_row = await db.scalar(
        select(Swipe).where(Swipe.swiper_id == swiper_id_str, Swipe.swiped_id == recipient_id)
    )
    if not swipe_row:
        raise HTTPException(status_code=404, detail="No swipe request found to accept.")

    # Create match (user_a = recipient, user_b = swiper) -- use your create_match
    match_res = await create_match(db, user_a_id=recipient_id, user_b_id=swiper_id_str, score=1.0)

    # update swipe row to mark it was accepted (optional)
    swipe_row.liked = True
    db.add(swipe_row)
    await db.commit()

    # remove the original swipe_request notification rows (optional)
    await db.execute(
        delete(Notification).where(
            Notification.user_id == recipient_id,
            Notification.type == "swipe_request",
            Notification.actor_id == swiper_id_str
        )
    )
    await db.commit()

    return {"status": "ok", "match": match_res}

@router.post("/swipe/reject/{swiper_id}")
async def reject_swipe(
    swiper_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Current user rejects a swipe request from swiper_id -> delete pending swipe row.
    No notification to the swiper (silent).
    """
    swiper_id_str = str(swiper_id)
    recipient_id = str(current_user.id)

    # delete the swipe row where swiper->recipient
    res = await db.execute(
        delete(Swipe).where(Swipe.swiper_id == swiper_id_str, Swipe.swiped_id == recipient_id)
    )
    await db.commit()

    # Also delete the stored swipe_request notification (so it won't be replayed)
    await db.execute(
        delete(Notification).where(
            Notification.user_id == recipient_id,
            Notification.type == "swipe_request",
            Notification.actor_id == swiper_id_str
        )
    )
    await db.commit()

    return {"status": "ok", "rejected_swiper_id": swiper_id_str}


@router.get("/blocked")
async def list_blocked_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    rows = (await db.execute(
        select(UserBlock).where(UserBlock.blocker_id == current_user.id)
    )).scalars().all()

    blocked_users = []

    for row in rows:
        user = await db.scalar(
            select(User).where(User.id == row.blocked_id)
        )
        if user:
            blocked_users.append({
                "id": str(user.id),
                "full_name": user.full_name,
                "profile_photo": user.profile_photo,
                "blocked_at": row.created_at.isoformat(),
            })

    return {"blocked": blocked_users}


@router.delete("/block/{blocked_id}")
async def unblock_user(
    blocked_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    row = await db.scalar(
        select(UserBlock).where(
            (UserBlock.blocker_id == current_user.id) &
            (UserBlock.blocked_id == str(blocked_id))
        )
    )

    if not row:
        return {"status": "not_blocked"}

    await db.delete(row)
    await db.commit()

    return {"status": "unblocked", "unblocked_user": str(blocked_id)}