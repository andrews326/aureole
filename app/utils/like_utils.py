# utils/like_utils.py


from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from models.match_model import Like, Match, Swipe
from models.user_model import User
from services.notification_service import create_and_push_notification


# -------------------------------
#  CONFIGURABLE LIMITS
# -------------------------------
MAX_LIKES_PER_MINUTE = 10
MAX_LIKES_PER_DAY = 500


# -------------------------------
#  RATE LIMIT CHECK
# -------------------------------
async def check_like_rate_limit(db: AsyncSession, liker_id: str):
    """Ensure a user doesn’t exceed per-minute and per-day like limits."""
    now = datetime.now(timezone.utc)
    one_min_ago = now - timedelta(minutes=1)
    one_day_ago = now - timedelta(days=1)

    # per-minute limit
    q_min = await db.execute(
        select(func.count()).where(Like.liker_id == liker_id, Like.created_at >= one_min_ago)
    )
    likes_last_min = q_min.scalar_one()
    if likes_last_min >= MAX_LIKES_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many likes — please slow down.")

    # per-day limit
    q_day = await db.execute(
        select(func.count()).where(Like.liker_id == liker_id, Like.created_at >= one_day_ago)
    )
    likes_last_day = q_day.scalar_one()
    if likes_last_day >= MAX_LIKES_PER_DAY:
        raise HTTPException(status_code=429, detail="Daily like limit reached.")


# -------------------------------
#  SWIPE UPSERT (for undo/rewind)
# -------------------------------
async def update_or_create_swipe(db: AsyncSession, swiper_id: str, swiped_id: str):
    """
    Update an existing swipe record or create a new one.
    Ensures a like sets undone=False.
    """
    q = await db.execute(
        select(Swipe).where(Swipe.swiper_id == swiper_id, Swipe.swiped_id == swiped_id)
    )
    existing = q.scalar_one_or_none()

    if existing:
        existing.liked = True
        existing.undone = False
        db.add(existing)
    else:
        db.add(Swipe(swiper_id=swiper_id, swiped_id=swiped_id, liked=True, undone=False))
    await db.flush()


# -------------------------------
#  LIKE CREATION (idempotent)
# -------------------------------
async def create_like_if_not_exists(db: AsyncSession, liker_id: str, liked_id: str) -> bool:
    """
    Insert a new Like if it doesn't exist.
    Returns True if created, False if already exists.
    """
    q = await db.execute(
        select(Like).where(Like.liker_id == liker_id, Like.liked_id == liked_id)
    )
    existing = q.scalar_one_or_none()
    if existing:
        return False

    like = Like(liker_id=liker_id, liked_id=liked_id)
    db.add(like)
    try:
        await db.flush()
        return True
    except IntegrityError:
        await db.rollback()
        return False


# -------------------------------
#  MUTUAL MATCH DETECTION
# -------------------------------
async def detect_and_create_match(db: AsyncSession, liker_id: str, liked_id: str) -> bool:
    """
    Check if mutual like exists; if yes, create or update Match.
    Returns True if a match was created or updated.
    """
    now = datetime.now(timezone.utc)
    q = await db.execute(
        select(Like).where(Like.liker_id == liked_id, Like.liked_id == liker_id)
    )
    reverse_like = q.scalar_one_or_none()

    if not reverse_like:
        return False

    # mutual -> create match if not exists
    try:
        match = Match(
            user_id=liker_id,
            target_id=liked_id,
            score=0.5,
            is_mutual=True,
            matched_at=now,
        )
        db.add(match)
        await db.flush()
        return True
    except IntegrityError:
        # If match already exists, update mutual flag
        await db.rollback()
        q2 = await db.execute(
            select(Match).where(Match.user_id == liker_id, Match.target_id == liked_id)
        )
        existing = q2.scalar_one_or_none()
        if existing:
            existing.is_mutual = True
            existing.matched_at = now
            db.add(existing)
            await db.flush()
            return True
    return False


# -------------------------------
#  LIKE NOTIFICATION
# -------------------------------
async def notify_like(db: AsyncSession, liker_id: str, liked_id: str):
    """Send a like notification."""
    q = await db.execute(select(User.full_name).where(User.id == liker_id))
    liker_name = q.scalar_one_or_none()

    await create_and_push_notification(
        db=db,
        recipient_id=liked_id,
        notif_type="like",
        actor_id=liker_id,
        actor_name=liker_name,
        meta={"note": "Someone liked you!"}
    )


# -------------------------------
#  MATCH NOTIFICATIONS
# -------------------------------
async def notify_match(db: AsyncSession, user_a: str, user_b: str):
    """Send match notifications to both users."""
    q = await db.execute(select(User.full_name).where(User.id == user_a))
    a_name = q.scalar_one_or_none()

    await create_and_push_notification(
        db=db,
        recipient_id=user_b,
        notif_type="match",
        actor_id=user_a,
        actor_name=a_name,
        target_id=user_a,
        meta={"mutual": True}
    )
    await create_and_push_notification(
        db=db,
        recipient_id=user_a,
        notif_type="match",
        actor_id=user_b,
        actor_name=None,
        target_id=user_b,
        meta={"mutual": True}
    )


# -------------------------------
#  Generic Rate-Limiter
# -------------------------------
async def check_action_rate_limit(
    db: AsyncSession,
    table_model,
    user_field: str,
    user_id: str,
    per_minute: int,
    per_day: int,
    timestamp_field: str = "created_at",
):
    """
    Generic rate limiter for any user-based action table.
    Example usage:
        await check_action_rate_limit(db, View, "viewer_id", viewer_id, 20, 500)
    """
    now = datetime.now(timezone.utc)
    one_min_ago = now - timedelta(minutes=1)
    one_day_ago = now - timedelta(days=1)

    # per-minute limit
    q_min = await db.execute(
        select(func.count())
        .select_from(table_model)
        .where(getattr(table_model, user_field) == user_id,
               getattr(table_model, timestamp_field) >= one_min_ago)
    )
    count_min = q_min.scalar_one()
    if count_min >= per_minute:
        raise HTTPException(status_code=429, detail=f"Too many {table_model.__tablename__} actions this minute.")

    # per-day limit
    q_day = await db.execute(
        select(func.count())
        .select_from(table_model)
        .where(getattr(table_model, user_field) == user_id,
               getattr(table_model, timestamp_field) >= one_day_ago)
    )
    count_day = q_day.scalar_one()
    if count_day >= per_day:
        raise HTTPException(status_code=429, detail=f"Too many {table_model.__tablename__} actions today.")
