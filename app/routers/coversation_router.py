# app/routers/conversation_router.py


from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from models.message_model import Message
from models.user_model import User
from models.match_model import Match
from db.session import get_db
from utils.deps import get_current_user  # adjust import paths

router = APIRouter(prefix="/session", tags=["messages"])

@router.get("/messages/{partner_id}")
async def get_conversation(
    partner_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1️⃣ Validate partner exists
    result = await db.execute(select(User).where(User.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Chat partner not found")

    if partner.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")

    # 2️⃣ Fetch conversation
    result = await db.execute(
        select(Message)
        .where(
            or_(
                (Message.sender_id == current_user.id) & (Message.receiver_id == partner.id),
                (Message.sender_id == partner.id) & (Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = result.scalars().all()

    # 3️⃣ Mark any newly delivered messages
    undelivered_ids = [
        m.id for m in messages
        if m.receiver_id == current_user.id and not m.is_delivered
    ]
    if undelivered_ids:
        await db.execute(
            update(Message)
            .where(Message.id.in_(undelivered_ids))
            .values(is_delivered=True)
        )
        await db.commit()

    # 4️⃣ Serialize & return
    return [
        {
            "id": str(m.id),
            "sender_id": str(m.sender_id),
            "receiver_id": str(m.receiver_id),
            "content": m.content,
            "is_read": m.is_read,
            "is_delivered": m.is_delivered,
            "created_at": m.created_at,
        }
        for m in messages
    ]

@router.get("/matches")
async def get_matches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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

    serialized = []
    for m in matches:
        partner_id = m.target_id if m.user_id == current_user.id else m.user_id

        partner_result = await db.execute(select(User).where(User.id == partner_id))
        partner = partner_result.scalar_one()

        serialized.append({
            "match_id": str(m.id),
            "partner_id": str(partner.id),  # 👈 frontend will use this for chat
            "name": partner.full_name,
            "age": partner.age,
            "bio": partner.bio,
            "imageUrl": partner.verified_photo_path,
            "compatibility": m.score,
            "is_active": partner.is_active,
            "is_verified": partner.is_verified,
            "mutual_interests": [],
            "common_values": [],
            "last_active_at": str(partner.last_active),
            "last_message_preview": None,
            "conversation_starters": [],
        })
    return serialized
