# services/ notification_service.py


from fastapi import HTTPException
from typing import Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_, func, delete, or_, update, any_
from sqlalchemy.ext.asyncio import AsyncSession
from models.match_model import View, Swipe, Like, Match
from models.user_model import User, Notification, UserMedia
from models.message_model import Message
from models.block_model import UserBlock


MAX_VIEWS_PER_MINUTE = 20
MAX_VIEWS_PER_DAY = 500
MAX_SWIPES_PER_MINUTE = 30
MAX_SWIPES_PER_DAY = 800
UNDO_COOLDOWN_MINUTES = 5     # undo must happen within 5 minutes
UNDO_DAILY_LIMIT = 3          # max 3 undos per day
MAX_MATCHES_PER_DAY = 15
BASE_URL = "http://127.0.0.1:8000"



async def record_swipe(
    db: AsyncSession,
    swiper_id: str,
    swiped_id: str,
    liked: bool
):
    """
    Record a swipe (right or left).
    For liked=True:
      • send rich 'swipe_like' notification
      • detect mutual swipe/like → send match notifications
    """

    # 1️⃣ Self protection
    if swiper_id == swiped_id:
        raise HTTPException(status_code=400, detail="Cannot swipe on yourself.")

    # 2️⃣ Target availability
    target = await db.scalar(select(User).where(User.id == swiped_id))
    if not target or not target.is_active or target.is_profile_hidden:
        raise HTTPException(status_code=404, detail="Target user not available or hidden.")

    from utils.like_utils import check_action_rate_limit

    # 3️⃣ Rate-limit
    await check_action_rate_limit(
        db, Swipe, "swiper_id", swiper_id,
        per_minute=MAX_SWIPES_PER_MINUTE,
        per_day=MAX_SWIPES_PER_DAY
    )

    # 4️⃣ Upsert swipe
    existing = await db.scalar(
        select(Swipe).where(
            Swipe.swiper_id == swiper_id,
            Swipe.swiped_id == swiped_id
        )
    )

    now = datetime.now(timezone.utc)

    if existing:
        # identical action = ignore
        if existing.liked == liked and not existing.undone:
            return {
                "created": False,
                "is_mutual": False,
                "swipe_id": str(existing.id)
            }

        existing.liked = liked
        existing.undone = False
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        swipe_obj = existing

    else:
        swipe_obj = Swipe(
            swiper_id=swiper_id,
            swiped_id=swiped_id,
            liked=liked,
            undone=False
        )
        db.add(swipe_obj)
        await db.commit()
        await db.refresh(swipe_obj)

    # 5️⃣ Left swipe → nothing else
    if not liked:
        return {"created": True, "is_mutual": False, "swipe_id": str(swipe_obj.id)}

    # -------------------------
    # 6️⃣ Build rich NOTIFICATION
    # -------------------------

    # fetch swiper name
    swiper_name = await db.scalar(
        select(User.full_name).where(User.id == swiper_id)
    )

    # fetch swiper profile image (verified first)
    media_res = await db.execute(
        select(UserMedia.file_path)
        .where(
            UserMedia.user_id == swiper_id,
            UserMedia.media_type == "image"
        )
        .order_by(
            UserMedia.is_verified.desc(),
            UserMedia.created_at.asc()
        )
    )

    rows = media_res.scalars().all()
    actor_image = rows[0] if rows else None

    # This is a RIGHT SWIPE → means "match request"
    await create_and_push_notification(
        db=db,
        recipient_id=swiped_id,
        notif_type="swipe_like",
        actor_id=swiper_id,
        actor_name=swiper_name,
        target_id=swiped_id,
        message_preview=f"{swiper_name} right-swiped you",
        meta={
            "action": "swipe_like",
            "match_request": True,
            "actor_image": actor_image,
            "timestamp": now.isoformat()
        }
    )

    # -------------------------
    # 7️⃣ Check mutual match
    # -------------------------
    reverse_swipe = await db.scalar(
        select(Swipe).where(
            Swipe.swiper_id == swiped_id,
            Swipe.swiped_id == swiper_id,
            Swipe.liked.is_(True),
            Swipe.undone.is_(False)
        )
    )

    reverse_like = await db.scalar(
        select(Like).where(
            Like.liker_id == swiped_id,
            Like.liked_id == swiper_id
        )
    )

    if reverse_swipe or reverse_like:

        # prevent duplicate matches
        match_exists = await db.scalar(
            select(Match).where(
                or_(
                    and_(Match.user_id == swiper_id, Match.target_id == swiped_id),
                    and_(Match.user_id == swiped_id, Match.target_id == swiper_id),
                )
            )
        )

        if not match_exists:
            match = Match(
                user_id=swiper_id,
                target_id=swiped_id,
                score=1.0,
                is_mutual=True,
                matched_at=now
            )
            db.add(match)
            await db.commit()
            await db.refresh(match)

            # Fetch image for *target user* too
            media_res2 = await db.execute(
                select(UserMedia.file_path)
                .where(
                    UserMedia.user_id == swiped_id,
                    UserMedia.media_type == "image"
                )
                .order_by(
                    UserMedia.is_verified.desc(),
                    UserMedia.created_at.asc()
                )
            )

            rows2 = media_res2.scalars().all()
            target_image = rows2[0] if rows2 else None

            # Notify swiped user
            await create_and_push_notification(
                db=db,
                recipient_id=swiped_id,
                notif_type="match",
                actor_id=swiper_id,
                actor_name=swiper_name,
                target_id=swiper_id,
                message_preview=f"You matched with {swiper_name}",
                meta={
                    "mutual": True,
                    "actor_image": actor_image,
                    "timestamp": now.isoformat()
                }
            )

            # Notify swiper user
            await create_and_push_notification(
                db=db,
                recipient_id=swiper_id,
                notif_type="match",
                actor_id=swiped_id,
                actor_name=target.full_name,
                target_id=swiped_id,
                message_preview=f"You matched with {target.full_name}",
                meta={
                    "mutual": True,
                    "actor_image": target_image,
                    "timestamp": now.isoformat()
                }
            )

            return {
                "created": True,
                "is_mutual": True,
                "swipe_id": str(swipe_obj.id),
                "match_id": str(match.id)
            }

    # -------------------------
    # 8️⃣ No mutual yet
    # -------------------------
    return {
        "created": True,
        "is_mutual": False,
        "swipe_id": str(swipe_obj.id)
    }




async def undo_last_swipe(db: AsyncSession, user_id: str):
    now = datetime.now(timezone.utc)

    # 1️⃣ Check premium access
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.premium_tier <= 0:
        raise HTTPException(
            status_code=403,
            detail="Undo (rewind) feature is available only for premium users."
        )

    # 2️⃣ Today's undo count
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
        raise HTTPException(status_code=429, detail="Undo limit reached for today.")

    # 3️⃣ Find last swipe
    last_swipe = await db.scalar(
        select(Swipe)
        .where(Swipe.swiper_id == user_id, Swipe.undone.is_(False))
        .order_by(Swipe.created_at.desc())
    )
    if not last_swipe:
        raise HTTPException(status_code=404, detail="No swipe to undo.")

    # 4️⃣ Cooldown window
    if (now - last_swipe.created_at) > timedelta(minutes=UNDO_COOLDOWN_MINUTES):
        raise HTTPException(
            status_code=400,
            detail=f"Undo window expired ({UNDO_COOLDOWN_MINUTES} min limit)."
        )

    # 5️⃣ Mark undone
    last_swipe.undone = True
    db.add(last_swipe)
    await db.commit()
    await db.refresh(last_swipe)

    # 6️⃣ If it was a right swipe, deactivate match silently
    if last_swipe.liked:
        match = await db.scalar(
            select(Match).where(
                Match.is_mutual.is_(True),
                Match.is_active.is_(True),
                (
                    (Match.user_id == user_id) & (Match.target_id == last_swipe.swiped_id)
                ) | (
                    (Match.user_id == last_swipe.swiped_id) & (Match.target_id == user_id)
                )
            )
        )

        if match:
            match.is_active = False
            match.is_mutual = False
            match.reason = "undo_swipe"
            match.unmatched_at = now
            db.add(match)
            await db.commit()

            # ❌ DO NOT notify the other user
            # Previously this leaked:
            # await create_and_push_notification(...)
            # REMOVE THIS COMPLETELY

    # 7️⃣ Notify only the user who did the undo
    swiper_name = await db.scalar(select(User.full_name).where(User.id == user_id))

    await create_and_push_notification(
        db=db,
        recipient_id=user_id,
        notif_type="undo_swipe",
        actor_id=user_id,
        actor_name=swiper_name,
        meta={
            "note": "You rewound your last swipe.",
            "cooldown": UNDO_COOLDOWN_MINUTES,
            "undos_left_today": UNDO_DAILY_LIMIT - (undo_count + 1),
        }
    )

    return {
        "message": "Swipe undone successfully.",
        "swipe_id": str(last_swipe.id),
        "undo_count_today": undo_count + 1,
    }


async def undo_like(db: AsyncSession, liker_id: str, liked_id: str):
    """Undo a previously given like. Premium-only feature with safe rollback."""
    now = datetime.now(timezone.utc)

    # 1️⃣ Check premium access
    liker = await db.scalar(select(User).where(User.id == liker_id))
    if not liker:
        raise HTTPException(status_code=404, detail="User not found.")
    if liker.premium_tier <= 0:
        raise HTTPException(
            status_code=403,
            detail="Undo like is available only for premium users."
        )

    # 2️⃣ Try deleting the like
    result = await db.execute(
        delete(Like).where(Like.liker_id == liker_id, Like.liked_id == liked_id)
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No like found to undo.")

    # 3️⃣ If a match existed, deactivate it silently
    match = await db.scalar(
        select(Match).where(
            Match.is_active.is_(True),
            Match.is_mutual.is_(True),
            (
                (Match.user_id == liker_id) & (Match.target_id == liked_id)
            ) | (
                (Match.user_id == liked_id) & (Match.target_id == liker_id)
            )
        )
    )

    if match:
        match.is_active = False
        match.is_mutual = False
        match.reason = "undo_like"
        match.unmatched_at = now
        db.add(match)
        await db.commit()

        # ❌ DO NOT notify the other user
        # REMOVE THIS:
        # await create_and_push_notification(...)

    # 4️⃣ Notify *only the liker* (UI feedback)
    await create_and_push_notification(
        db=db,
        recipient_id=liker_id,
        notif_type="undo_like",
        actor_id=liker_id,
        actor_name=liker.full_name,
        meta={
            "note": f"You unliked this user.",
            "premium_only": True,
            "timestamp": now.isoformat(),
        }
    )

    return {
        "message": "Like undone successfully.",
        "match_deactivated": bool(match),
        "premium_only": True
    }

async def unmatch_user(db: AsyncSession, user_id: str, target_id: str):
    """
    Unmatch AND block the target user.
    """
    now = datetime.now(timezone.utc)

    # 1) Validate users
    user = await db.scalar(select(User).where(User.id == user_id))
    target = await db.scalar(select(User).where(User.id == target_id))
    if not user or not target:
        raise HTTPException(404, "User not found.")

    # 2) Find active mutual match
    matches = (await db.execute(
        select(Match).where(
            (
                (Match.user_id == user_id) & (Match.target_id == target_id)
            ) | (
                (Match.user_id == target_id) & (Match.target_id == user_id)
            ),
            Match.is_active.is_(True),
            Match.is_mutual.is_(True),
        )
    )).scalars().all()

    if not matches:
        raise HTTPException(404, "No active match found.")

    # 3) Disable match rows
    for match in matches:
        match.is_active = False
        match.is_mutual = False
        match.reason = "block"
        match.unmatched_at = now
        db.add(match)

    # ---------------------------
    # 4️⃣ BLOCK THE USER (NEW)
    # ---------------------------
    existing = await db.scalar(
        select(UserBlock).where(
            (UserBlock.blocker_id == user_id) &
            (UserBlock.blocked_id == target_id)
        )
    )

    if not existing:
        db.add(UserBlock(
            blocker_id=user_id,
            blocked_id=target_id,
            hide_only=False,
        ))

    await db.commit()

    # 5) Notify self only
    await create_and_push_notification(
        db=db,
        recipient_id=user_id,
        notif_type="unmatch",
        actor_id=user_id,
        actor_name=user.full_name,
        target_id=target_id,
        meta={
            "self_action": True,
            "note": f"You blocked {target.full_name or 'this user'}.",
        },
    )

    return {
        "message": "User blocked and unmatched successfully.",
        "blocked_user": str(target_id),
        "timestamp": now.isoformat(),
    }


async def create_match(db: AsyncSession, user_a_id: str, user_b_id: str, score: float = 1.0):
    """
    Create mutual match entries between two users.
    Enforces daily match limit, prevents ghost matches (inactive/blocked),
    and sends notifications to both users.
    """
    if user_a_id == user_b_id:
        raise HTTPException(status_code=400, detail="Cannot match with yourself.")

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # 1️⃣ Validate both users
    users = (await db.execute(select(User).where(User.id.in_([user_a_id, user_b_id])))).scalars().all()
    if len(users) != 2:
        raise HTTPException(status_code=404, detail="One or both users not found.")

    user_a = next((u for u in users if str(u.id) == str(user_a_id)), None)
    user_b = next((u for u in users if str(u.id) == str(user_b_id)), None)

    # 2️⃣ Prevent matches with inactive/hidden users
    if not user_a.is_active or user_a.is_profile_hidden:
        raise HTTPException(status_code=403, detail="Your profile must be active and visible to match.")
    if not user_b.is_active or user_b.is_profile_hidden:
        raise HTTPException(status_code=403, detail="The other user's profile is not available for matching.")

    # 3️⃣ Check daily match limit for user A
    match_count_today = await db.scalar(
        select(func.count()).where(
            Match.user_id == user_a_id,
            Match.created_at >= today_start
        )
    )
    if match_count_today >= MAX_MATCHES_PER_DAY:
        raise HTTPException(status_code=429, detail="Daily match limit reached (15 per day).")

    # 4️⃣ Fetch existing matches in both directions
    existing_ab = await db.scalar(select(Match).where(Match.user_id == user_a_id, Match.target_id == user_b_id))
    existing_ba = await db.scalar(select(Match).where(Match.user_id == user_b_id, Match.target_id == user_a_id))

    # 5️⃣ Skip if already active and mutual
    if existing_ab and existing_ab.is_active and existing_ab.is_mutual:
        return {"created": False, "match_id": str(existing_ab.id)}

    try:
        # 6️⃣ Create or update both match directions
        if not existing_ab:
            existing_ab = Match(
                id=uuid.uuid4(),
                user_id=user_a_id,
                target_id=user_b_id,
                score=score,
                is_mutual=True,
                is_active=True,
                matched_at=now
            )
            db.add(existing_ab)
        else:
            existing_ab.is_mutual = True
            existing_ab.is_active = True
            existing_ab.matched_at = existing_ab.matched_at or now
            existing_ab.score = score
            db.add(existing_ab)

        if not existing_ba:
            existing_ba = Match(
                id=uuid.uuid4(),
                user_id=user_b_id,
                target_id=user_a_id,
                score=score,
                is_mutual=True,
                is_active=True,
                matched_at=now
            )
            db.add(existing_ba)
        else:
            existing_ba.is_mutual = True
            existing_ba.is_active = True
            existing_ba.matched_at = existing_ba.matched_at or now
            existing_ba.score = score
            db.add(existing_ba)

        await db.commit()
        await db.refresh(existing_ab)

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create match: {e}")

    # 7️⃣ Send notifications
    await create_and_push_notification(
        db=db,
        recipient_id=user_a_id,
        notif_type="match",
        actor_id=user_b_id,
        actor_name=user_b.full_name,
        target_id=user_b_id,
        meta={
            "mutual": True,
            "score": score,
            "note": f"You matched with {user_b.full_name or 'someone'}!"
        },
    )
    await create_and_push_notification(
        db=db,
        recipient_id=user_b_id,
        notif_type="match",
        actor_id=user_a_id,
        actor_name=user_a.full_name,
        target_id=user_a_id,
        meta={
            "mutual": True,
            "score": score,
            "note": f"You matched with {user_a.full_name or 'someone'}!"
        },
    )

    return {
        "created": True,
        "match_id": str(existing_ab.id),
        "timestamp": now.isoformat(),
    }


async def mark_message_delivered_in_db(db: AsyncSession, message_id: str):
    """Marks a message as delivered in the database."""
    await db.execute(
        update(Message)
        .where(Message.id == message_id)
        .values(is_delivered=True)
    )
    await db.commit()



async def create_and_push_notification(
    db: AsyncSession,
    recipient_id: str,                   # who receives it
    notif_type: str,                     # "like" | "view" | "match" | ...
    actor_id: Optional[str] = None,      # who triggered it
    actor_name: Optional[str] = None,    # optional friendly name
    target_id: Optional[str] = None,     # secondary user reference (match partner, etc.)
    conversation_id: Optional[str] = None,
    message_preview: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
):
    """
    Creates a Notification row and immediately sends it in real time over WebSocket.
    If user is offline, the record is left with notified_at=None for replay later.
    """
    from utils.socket_manager import manager

    notif_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # 🧩 Resolve actor_name if not provided
    if actor_id and not actor_name:
        result = await db.execute(select(User.full_name).where(User.id == actor_id))
        actor_name = result.scalar_one_or_none()

    # 🧱 Build payload
    payload = {
        "id": str(notif_id),
        "type": notif_type,
        "actor_id": str(actor_id) if actor_id else None,
        "actor_name": actor_name,
        "target_id": str(target_id) if target_id else None,
        "conversation_id": str(conversation_id) if conversation_id else None,
        "message_preview": message_preview,
        "meta": meta or {},
        "created_at": now.isoformat(),
    }

    # 🗃️ Create the DB row first (not yet marked notified)
    notif = Notification(
        id=notif_id,
        user_id=recipient_id,
        type=notif_type,
        actor_id=actor_id,
        actor_name=actor_name,
        target_id=target_id,
        conversation_id=conversation_id,
        message_preview=message_preview,
        payload=payload,
        is_read=False,
        created_at=now,
        notified_at=None,   # 👈 important: means "not yet pushed"
    )

    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    # 📡 Try to push in real-time
    try:
        success = await manager.send_personal_message(recipient_id, {
            "event": "notification",
            "data": {
                   "id": str(notif.id),
                   "type": notif.type,
                   "actor_id": notif.actor_id,
                   "actor_name": notif.actor_name,
                   "target_id": notif.target_id,
                   "conversation_id": notif.conversation_id,
                   "message_preview": notif.message_preview,
                   "timestamp": notif.created_at.isoformat(),
                   "payload": notif.payload,    # keep the old structure EXACTLY as-is
                   }

        })

        if success:
            # ✅ Mark as notified
            notif.notified_at = datetime.now(timezone.utc)
            db.add(notif)
            await db.commit()
            print(f"✅ Notification {notif_id} delivered live to {recipient_id}")
        else:
            print(f"📨 Stored offline notification for {recipient_id}")

    except Exception as e:
        # 🧩 If failed (user offline or WS closed)
        print(f"⚠️ Failed to send notification {notif_id} to {recipient_id}: {e}")

    return notif


async def fetch_user_media_map(db, user_ids: list[str]):
    """
    Returns dict -> { user_id: [photo_urls...] }
    Always sorted by created_at.
    Always normalized to full URLs.
    """
    if not user_ids:
        return {}

    stmt = (
        select(UserMedia.user_id, UserMedia.file_path)
        .where(
            UserMedia.user_id.in_(user_ids),
            UserMedia.media_type == "image"
        )
        .order_by(UserMedia.created_at)
    )

    res = await db.execute(stmt)
    rows = res.all()

    media_map = {}

    for uid, path in rows:
        uid = str(uid)

        # Normalize URL
        url = (
            path if path.startswith("http")
            else f"{BASE_URL}/{path.lstrip('/')}"
        )

        media_map.setdefault(uid, []).append(url)

    return media_map



async def assert_can_send(db, sender_id, receiver_id):
    # Case 1: receiver blocked sender → sender cannot message
    blocked_by_receiver = await db.scalar(
        select(UserBlock).where(
            (UserBlock.blocker_id == receiver_id) &
            (UserBlock.blocked_id == sender_id)
        )
    )
    if blocked_by_receiver:
        raise HTTPException(403, "You cannot message this user. They have blocked you.")

    # Case 2: sender blocked receiver → sender cannot message either
    sender_has_blocked = await db.scalar(
        select(UserBlock).where(
            (UserBlock.blocker_id == sender_id) &
            (UserBlock.blocked_id == receiver_id)
        )
    )
    if sender_has_blocked:
        raise HTTPException(403, "You have blocked this user.")
