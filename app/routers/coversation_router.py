# app/routers/conversation_router.py


from fastapi import APIRouter, Depends, Query, status
from datetime import datetime, timezone
from sqlalchemy import select, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from models.message_model import Message,ChatMedia, MessageReaction
from models.user_model import User
from models.match_model import Match
from db.session import get_db
from utils.deps import get_current_user  # adjust import paths
from pydantic import BaseModel
from db.session import async_session
from utils.socket_manager import manager

# service functions (you saved in services/message_service.py)
from services.message_service import (
    delete_message_service,
    upsert_reaction_service,
    remove_reaction_service,
)

router = APIRouter(prefix="/session", tags=["messages"])


@router.get("/messages/{partner_id}")
async def get_conversation(
    partner_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -----------------------
    # 1) Fetch messages + media (unchanged)
    # -----------------------
    q = (
        select(Message, ChatMedia)
        .outerjoin(ChatMedia, ChatMedia.id == Message.media_id)
        .where(
            or_(
                (Message.sender_id == current_user.id) &
                (Message.receiver_id == partner_id),
                (Message.sender_id == partner_id) &
                (Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .limit(limit)
        .offset(offset)
    )

    rows = (await db.execute(q)).all()
    messages = [m for m, _ in rows]
    message_ids = [m.id for m in messages]

    # -----------------------
    # 2) Fetch reactions for all messages in one fast query
    # -----------------------
    if message_ids:
        reaction_rows = (
            await db.execute(
                select(MessageReaction)
                .where(MessageReaction.message_id.in_(message_ids))
            )
        ).scalars().all()
    else:
        reaction_rows = []

    # Build dict: message_id → { user_id: reaction }
    reactions_map: dict[str, dict[str, str]] = {}
    for r in reaction_rows:
        mid = str(r.message_id)
        if mid not in reactions_map:
            reactions_map[mid] = {}
        reactions_map[mid][str(r.user_id)] = r.reaction

    # -----------------------
    # 3) Build output
    # -----------------------
    output = []
    for msg, media in rows:
        item = {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "receiver_id": str(msg.receiver_id),
            "content": msg.content or "",
            "message_type": msg.message_type,
            "media_id": str(msg.media_id) if msg.media_id else None,
            "is_read": msg.is_read,
            "is_delivered": msg.is_delivered,
            "created_at": msg.created_at,

            # ⭐ NEW: reactions persisted on backend
            "reactions": reactions_map.get(str(msg.id), {}),   # <<--- SAFE
        }

        if media:
            item["media_url"] = media.file_path
            item["thumb_url"] = media.thumb_path
            item["file_type"] = media.file_type
            item["kind"] = media.kind

        output.append(item)

    return output


def is_recently_active(last_active_time, minutes=10):
    """Check if user was active within the last N minutes"""
    if not last_active_time:
        return False
    
    # Handle both datetime objects and string representations
    if isinstance(last_active_time, str):
        last_active_time = datetime.fromisoformat(last_active_time.replace('Z', '+00:00'))
    
    if last_active_time.tzinfo is None:
        # Assume UTC if no timezone info
        last_active_time = last_active_time.replace(tzinfo=timezone.utc)
    
    now = datetime.now(timezone.utc)
    return (now - last_active_time).total_seconds() < (minutes * 60)


@router.get("/matches")
async def get_matches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get all matches first
    result = await db.execute(
        select(Match).where(
            and_(
                Match.is_active == True,
                Match.is_mutual == True,
                or_(Match.user_id == current_user.id, Match.target_id == current_user.id)
            )
        )
    )
    matches = result.scalars().all()

    # Get all partner IDs
    partner_ids = []
    for m in matches:
        partner_id = m.target_id if m.user_id == current_user.id else m.user_id
        partner_ids.append(partner_id)

    # Fetch last messages for all conversations in one query
    last_messages_query = text("""
        SELECT DISTINCT ON (conversation_pair) 
            sender_id, receiver_id, content, message_type, created_at,
            CASE 
                WHEN sender_id = :current_user_id THEN receiver_id
                ELSE sender_id
            END as other_user_id
        FROM (
            SELECT 
                sender_id, receiver_id, content, message_type, created_at,
                LEAST(sender_id, receiver_id) as min_id,
                GREATEST(sender_id, receiver_id) as max_id,
                CONCAT(LEAST(sender_id, receiver_id), '-', GREATEST(sender_id, receiver_id)) as conversation_pair
            FROM messages 
            WHERE (sender_id = :current_user_id OR receiver_id = :current_user_id)
                AND (sender_id = ANY(:partner_ids) OR receiver_id = ANY(:partner_ids))
            ORDER BY created_at DESC
        ) as ordered_msgs
        ORDER BY conversation_pair, created_at DESC
    """)

    last_messages_result = await db.execute(last_messages_query, {
        "current_user_id": current_user.id,
        "partner_ids": partner_ids
    })
    last_messages = last_messages_result.fetchall()

    # Create a mapping of partner_id to last message
    last_message_map = {}
    for msg in last_messages:
        other_user_id = str(msg.other_user_id)
        last_message_map[other_user_id] = msg

    # Build the response
    serialized = []
    for m in matches:
        partner_id = m.target_id if m.user_id == current_user.id else m.user_id

        partner_result = await db.execute(select(User).where(User.id == partner_id))
        partner = partner_result.scalar_one()

        # Get last message from our map
        last_message = last_message_map.get(str(partner_id))
        last_message_preview = None
        if last_message:
            if last_message.message_type == 'text':
                last_message_preview = last_message.content
            elif last_message.message_type == 'image':
                last_message_preview = "📷 Photo"
            elif last_message.message_type == 'video':
                last_message_preview = "🎥 Video"
            elif last_message.message_type == 'audio':
                last_message_preview = "🎵 Audio"
            else:
                last_message_preview = f"📎 {last_message.message_type.title()}"

        serialized.append({
            "match_id": str(m.id),
            "partner_id": str(partner.id),
            "name": partner.full_name,
            "age": partner.age,
            "bio": partner.bio,
            "imageUrl": partner.verified_photo_path,
            "compatibility": m.score,
            "is_active": partner.is_active,
            "is_verified": partner.is_verified,
            "mutual_interests": [],
            "common_values": [],
            "last_active_at": str(partner.last_active) if partner.last_active else None,
            "last_message_preview": last_message_preview,
            "conversation_starters": [],
            # 🔥 FIXED: Use time-based online status instead of is_active
            "is_online": is_recently_active(partner.last_active, minutes=10),  # Online if active in last 10 minutes
        })
    return serialized

# ============================================================================= #

# -----------------------------
# 🚀 Pydantic Schemas
# -----------------------------

class ReactionRequest(BaseModel):
    reaction: str   # "good" | "bad" | "offensive" | etc.


class ReactionResponse(BaseModel):
    message_id: str
    user_id: str
    reaction: str
    changed: bool


# -----------------------------
# 🗑️ DELETE MESSAGE
# -----------------------------

@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message_endpoint(
    message_id: UUID,
    current_user: User = Depends(get_current_user),   # FIXED
):
    async with async_session() as db:
        deleted_msg: Message = await delete_message_service(
            db=db,
            message_id=message_id,
            current_user_id=current_user.id,  # FIXED
        )

    payload = {
        "type": "message_deleted",
        "message_id": str(deleted_msg.id),
        "by_user_id": str(current_user.id),
    }

    await manager.send_personal_message(str(deleted_msg.sender_id), payload)
    await manager.send_personal_message(str(deleted_msg.receiver_id), payload)



# -----------------------------
# ⭐ ADD OR UPDATE REACTION
# -----------------------------

@router.post("/{message_id}/reactions", response_model=ReactionResponse)
async def react_message_endpoint(
    message_id: UUID,
    body: ReactionRequest,
    current_user: User = Depends(get_current_user),   # FIXED
):
    async with async_session() as db:
        reaction_row, msg, changed = await upsert_reaction_service(
            db=db,
            message_id=message_id,
            user_id=current_user.id,     # FIXED
            reaction_value=body.reaction,
        )

    if changed:
        payload = {
            "type": "message_reaction",
            "message_id": str(message_id),
            "user_id": str(current_user.id),
            "reaction": body.reaction,
        }

        await manager.send_personal_message(str(msg.sender_id), payload)
        await manager.send_personal_message(str(msg.receiver_id), payload)

    return ReactionResponse(
        message_id=str(reaction_row.message_id),
        user_id=str(reaction_row.user_id),
        reaction=reaction_row.reaction,
        changed=changed,
    )



# -----------------------------
# ❌ REMOVE REACTION
# -----------------------------

@router.delete("/{message_id}/reactions", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction_endpoint(
    message_id: UUID,
    current_user: User = Depends(get_current_user),  # FIXED
):
    async with async_session() as db:
        removed, msg = await remove_reaction_service(
            db=db,
            message_id=message_id,
            user_id=current_user.id,   # FIXED
        )

    if removed:
        payload = {
            "type": "message_reaction_removed",
            "message_id": str(message_id),
            "user_id": str(current_user.id),
        }

        await manager.send_personal_message(str(msg.sender_id), payload)
        await manager.send_personal_message(str(msg.receiver_id), payload)
