# services/match_service.py


import uuid
from typing import List, Dict
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_, or_, delete, func, desc
from services.ai_service import run_ai_profile_process
from utils.match_logic import create_notification, generate_conversation_starters
from sqlalchemy.future import select
from models.user_model import User, Notification, UserMedia
from models.message_model import Message
from models.profile_model import Profile
from models.match_model import View, Match, Like, Swipe



# -----------------------------
# Get Matched users
# -----------------------------
async def get_user_matches(db: AsyncSession, user_id: str) -> List[Dict]:
    # 1️⃣ Fetch all mutual matches for the user
    result = await db.execute(
        select(Match).where(
            ((Match.user_id == user_id) | (Match.target_id == user_id)),
            Match.is_mutual == True
        )
    )
    matches = result.scalars().all()

    # Deduplicate matches by the other user
    seen_user_ids = set()
    enriched_matches = []

    for match in matches:
        match_user_id = match.target_id if match.user_id == user_id else match.user_id
        if match_user_id in seen_user_ids:
            continue
        seen_user_ids.add(match_user_id)

        # Fetch matched user's info
        user_res = await db.execute(select(User).where(User.id == match_user_id))
        match_user = user_res.scalar_one_or_none()
        if not match_user:
            continue

        # Fetch verified image (first verified, fallback to any)
        media_res = await db.execute(
            select(UserMedia)
            .where(UserMedia.user_id == match_user_id, UserMedia.media_type == "image")
            .order_by(UserMedia.is_verified.desc(), UserMedia.created_at.asc())
        )
        images = media_res.scalars().all()
        image_url = images[0].file_path if images else None

        # Fetch or generate profile preferences
        profile_res = await db.execute(select(Profile).where(Profile.user_id == match_user_id))
        profile = profile_res.scalar_one_or_none()

        if profile and profile.preferences:
            interests = profile.preferences.get("interests", [])
            values = profile.preferences.get("values", [])
        else:
            try:
                ai_data = await run_ai_profile_process(db, match_user)
                interests = ai_data["preferences"].get("interests", [])
                values = ai_data["preferences"].get("values", [])
            except Exception:
                interests, values = [], []

        # Compute mutual interests and values with current user
        mutual_interests, common_values = [], []
        user_profile_res = await db.execute(select(Profile).where(Profile.user_id == user_id))
        user_profile = user_profile_res.scalar_one_or_none()
        if user_profile and user_profile.preferences:
            user_interests = user_profile.preferences.get("interests", [])
            user_values = user_profile.preferences.get("values", [])
            mutual_interests = list(set(interests) & set(user_interests))
            common_values = list(set(values) & set(user_values))

        # Fetch last message preview
        msg_res = await db.execute(
            select(Message)
            .where(
                ((Message.sender_id == user_id) & (Message.receiver_id == match_user_id)) |
                ((Message.sender_id == match_user_id) & (Message.receiver_id == user_id))
            )
            .order_by(Message.created_at.desc())
        )
        last_msg = msg_res.scalars().first()
        last_message_preview = last_msg.content if last_msg else None

        enriched_matches.append({
            "match_id": str(match.id),
            "user_id": str(match_user.id),
            "name": match_user.full_name or "",
            "age": match_user.age or 0,
            "bio": match_user.bio or "",
            "imageUrl": image_url,
            "compatibility": round(match.score or 0.5, 2),
            "matched_at": match.matched_at or match.created_at,
            "is_active": match_user.is_active,
            "is_verified": match_user.is_verified,
            "mutual_interests": mutual_interests,
            "common_values": common_values,
            "last_active_at": match_user.last_active,
            "last_message_preview": last_message_preview,
            "conversation_starters": generate_conversation_starters(mutual_interests, common_values)[:5]
        })

    # Sort matches by most recent matched_at
    enriched_matches.sort(key=lambda x: x["matched_at"], reverse=True)
    return enriched_matches


# -----------------------------
# Views
# -----------------------------
async def record_view(db: AsyncSession, viewer_id: str, viewed_id: str, dedupe: bool = True):
    """
    Record a profile view. If dedupe=True, avoid duplicating the same viewer->viewed pair.
    Creates a 'view' notification for the viewed user.
    Returns: dict { "created": bool, "view_id": uuid }
    """
    if viewer_id == viewed_id:
        raise HTTPException(status_code=400, detail="Cannot view your own profile.")

    if dedupe:
        existing = await db.scalar(
            select(View).where(View.viewer_id == viewer_id, View.viewed_id == viewed_id)
        )
        if existing:
            return {"created": False, "view_id": str(existing.id)}

    view = View(id=uuid.uuid4(), viewer_id=viewer_id, viewed_id=viewed_id)
    db.add(view)
    await db.commit()
    await db.refresh(view)

    # Notification (lightweight)
    await create_notification(db, user_id=viewed_id, type="view", payload={"viewer_id": str(viewer_id)})

    return {"created": True, "view_id": str(view.id)}


# -----------------------------
# Matches creation helper
# -----------------------------
async def create_match(db: AsyncSession, user_a_id: str, user_b_id: str, score: float = 1.0):
    """
    Create match entries for both directions if not exists. Mark as mutual.
    Returns match_id for the created/updated primary entry.
    """
    if user_a_id == user_b_id:
        raise HTTPException(status_code=400, detail="Cannot match with yourself.")

    # ensure deterministic ordering to search existing
    existing_ab = await db.scalar(
        select(Match).where(Match.user_id == user_a_id, Match.target_id == user_b_id)
    )
    existing_ba = await db.scalar(
        select(Match).where(Match.user_id == user_b_id, Match.target_id == user_a_id)
    )

    now = datetime.now(timezone.utc)

    # If neither exists, create both
    if not existing_ab and not existing_ba:
        match_ab = Match(
            id=uuid.uuid4(),
            user_id=user_a_id,
            target_id=user_b_id,
            score=score,
            is_mutual=True,
            is_active=True,
            matched_at=now
        )
        match_ba = Match(
            id=uuid.uuid4(),
            user_id=user_b_id,
            target_id=user_a_id,
            score=score,
            is_mutual=True,
            is_active=True,
            matched_at=now
        )
        db.add_all([match_ab, match_ba])
        await db.commit()
        await db.refresh(match_ab)
        # Notify both
        await create_notification(db, user_id=user_a_id, type="match", payload={"with_user": str(user_b_id)})
        await create_notification(db, user_id=user_b_id, type="match", payload={"with_user": str(user_a_id)})
        return {"created": True, "match_id": str(match_ab.id)}

    # If one or both exist, set both to mutual/active
    updated_id = None
    if existing_ab:
        existing_ab.is_mutual = True
        existing_ab.is_active = True
        existing_ab.matched_at = existing_ab.matched_at or now
        existing_ab.score = score
        updated_id = str(existing_ab.id)
        db.add(existing_ab)
    if existing_ba:
        existing_ba.is_mutual = True
        existing_ba.is_active = True
        existing_ba.matched_at = existing_ba.matched_at or now
        existing_ba.score = score
        db.add(existing_ba)

    await db.commit()
    # send notifications only if this transition marks a new mutual state
    # (simple strategy: notify both anyway; advanced: check previous is_mutual)
    await create_notification(db, user_id=user_a_id, type="match", payload={"with_user": str(user_b_id)})
    await create_notification(db, user_id=user_b_id, type="match", payload={"with_user": str(user_a_id)})

    return {"created": False, "match_id": updated_id}



# -----------------------------
# Swipes
# -----------------------------
async def record_swipe(db: AsyncSession, swiper_id: str, swiped_id: str, liked: bool):
    """
    Record a swipe. If liked=True, check for mutual swipe and create match.
    Returns: dict with keys: created(bool), is_mutual(bool), match_id(optional), swipe_id
    """
    if swiper_id == swiped_id:
        raise HTTPException(status_code=400, detail="Cannot swipe on yourself.")

    # check if target exists & active
    target = await db.scalar(select(User).where(User.id == swiped_id))
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="Target user not available.")

    # Upsert behavior: if a swipe exists, update; else create
    existing = await db.scalar(
        select(Swipe).where(Swipe.swiper_id == swiper_id, Swipe.swiped_id == swiped_id)
    )
    if existing:
        # if same outcome, return existing
        if existing.liked == liked and not existing.undone:
            return {"created": False, "is_mutual": False, "swipe_id": str(existing.id)}
        # otherwise update record
        existing.liked = liked
        existing.undone = False
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        swipe_obj = existing
    else:
        swipe_obj = Swipe(id=uuid.uuid4(), swiper_id=swiper_id, swiped_id=swiped_id, liked=liked, undone=False)
        db.add(swipe_obj)
        await db.commit()
        await db.refresh(swipe_obj)

    # If left swipe, just record and return
    if not liked:
        return {"created": True, "is_mutual": False, "swipe_id": str(swipe_obj.id)}

    # liked=True -> notify target and check for mutual swipe/like
    await create_notification(db, user_id=swiped_id, type="swipe_like", payload={"from": str(swiper_id)})

    # Check for mutual swipe (target had previously swiped right)
    reverse_swipe = await db.scalar(
        select(Swipe).where(Swipe.swiper_id == swiped_id, Swipe.swiped_id == swiper_id, Swipe.liked.is_(True), Swipe.undone.is_(False))
    )

    # Also check for explicit mutual 'Like' as well (if you mix both systems)
    reverse_like = await db.scalar(
        select(Like).where(Like.liker_id == swiped_id, Like.liked_id == swiper_id)
    )

    if reverse_swipe or reverse_like:
        # create mutual match
        res = await create_match(db, swiper_id, swiped_id, score=1.0)
        return {"created": True, "is_mutual": True, "swipe_id": str(swipe_obj.id), "match": res}

    return {"created": True, "is_mutual": False, "swipe_id": str(swipe_obj.id)}



# -----------------------------
# Likes (explicit)
# -----------------------------
async def record_like(db: AsyncSession, liker_id: str, liked_id: str):
    """
    Record explicit like. Checks duplicates, notifies, and checks for mutual like to create matches.
    Returns: dict { created, is_mutual, like_id, match(optional) }
    """
    if liker_id == liked_id:
        raise HTTPException(status_code=400, detail="Cannot like your own profile.")

    target = await db.scalar(select(User).where(User.id == liked_id))
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="Target user not available.")

    existing = await db.scalar(
        select(Like).where(Like.liker_id == liker_id, Like.liked_id == liked_id)
    )
    if existing:
        return {"created": False, "is_mutual": False, "like_id": str(existing.id)}

    like = Like(id=uuid.uuid4(), liker_id=liker_id, liked_id=liked_id)
    db.add(like)
    await db.commit()
    await db.refresh(like)

    # Notify liked user
    await create_notification(db, user_id=liked_id, type="like", payload={"from": str(liker_id)})

    # Check for mutual like
    reverse = await db.scalar(
        select(Like).where(Like.liker_id == liked_id, Like.liked_id == liker_id)
    )
    if reverse:
        res = await create_match(db, liker_id, liked_id, score=1.0)
        return {"created": True, "is_mutual": True, "like_id": str(like.id), "match": res}

    # Also check for reverse swipe (if other user swiped right earlier)
    reverse_swipe = await db.scalar(
        select(Swipe).where(Swipe.swiper_id == liked_id, Swipe.swiped_id == liker_id, Swipe.liked.is_(True), Swipe.undone.is_(False))
    )
    if reverse_swipe:
        res = await create_match(db, liker_id, liked_id, score=1.0)
        return {"created": True, "is_mutual": True, "like_id": str(like.id), "match": res}

    return {"created": True, "is_mutual": False, "like_id": str(like.id)}

UNDO_COOLDOWN_MINUTES = 5       # must undo within 5 minutes of swipe
UNDO_DAILY_LIMIT = 3            # max 3 undos per day

# ---------------------------
# Undo Last Swipe (Rewind)
# ---------------------------
async def undo_last_swipe(db: AsyncSession, user_id: str):
    now = datetime.now(timezone.utc)

    # 1️⃣ Get today’s undo count
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    undo_count = await db.scalar(
        select(func.count())
        .select_from(Swipe)
        .where(
            Swipe.swiper_id == user_id,
            Swipe.undone.is_(True),
            Swipe.created_at >= today_start
        )
    )
    if undo_count >= UNDO_DAILY_LIMIT:
        return {"error": "Undo limit reached for today."}

    # 2️⃣ Find most recent non-undone swipe
    last_swipe = await db.scalar(
        select(Swipe)
        .where(Swipe.swiper_id == user_id, Swipe.undone.is_(False))
        .order_by(Swipe.created_at.desc())
    )
    if not last_swipe:
        return {"error": "No swipe to undo."}

    # 3️⃣ Check cooldown
    if (now - last_swipe.created_at) > timedelta(minutes=UNDO_COOLDOWN_MINUTES):
        return {"error": f"Undo window expired ({UNDO_COOLDOWN_MINUTES} min limit)."}

    # 4️⃣ Mark undone
    last_swipe.undone = True
    await db.commit()

    return {
        "message": "Swipe undone successfully.",
        "swipe_id": str(last_swipe.id),
        "undo_count_today": undo_count + 1,
    }


# ---------------------------
# Undo Like
# ---------------------------
async def undo_like(db: AsyncSession, liker_id: str, liked_id: str):
    result = await db.execute(
        delete(Like).where(Like.liker_id == liker_id, Like.liked_id == liked_id)
    )
    await db.commit()
    if result.rowcount == 0:
        return {"error": "No like found to undo."}
    return {"message": "Like undone successfully."}


# ---------------------------
# Unmatch
# ---------------------------
async def unmatch_user(db: AsyncSession, user_id: str, target_id: str):
    match = await db.scalar(
        select(Match).where(
            or_(
                and_(Match.user_id == user_id, Match.target_id == target_id),
                and_(Match.user_id == target_id, Match.target_id == user_id),
            ),
            Match.is_mutual.is_(True),
            Match.is_active.is_(True)
        )
    )

    if not match:
        return {"error": "No active match found."}

    match.is_active = False
    match.is_mutual = False
    await db.commit()

    # Notify the other user about unmatch
    notification = Notification(
        id=uuid.uuid4(),
        user_id=target_id,
        type="unmatch",
        payload={"by_user": str(user_id)},
        is_read=False,
    )
    db.add(notification)
    await db.commit()

    return {"message": "Match removed successfully."}


async def deactivate_match(db: AsyncSession, user_id: str, target_id: str, reason: str = "manual_unmatch"):
    match = await db.scalar(
        select(Match)
        .where(
            ((Match.user_id == user_id) & (Match.target_id == target_id)) |
            ((Match.user_id == target_id) & (Match.target_id == user_id)),
            Match.is_active.is_(True)
        )
    )

    if not match:
        return {"error": "No active match found."}

    match.is_active = False
    match.reason = reason
    match.unmatched_at = datetime.now(timezone.utc)
    match.updated_at = datetime.now(timezone.utc)

    await db.commit()

    # Notify the other user
    await create_notification(
        db=db,
        user_id=target_id,
        type="unmatch",
        payload={"by_user": user_id, "reason": reason}
    )

    return {"message": "Match deactivated successfully."}