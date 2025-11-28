# services/message_service.py


from typing import Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.message_model import Message, MessageReaction
from services.notification_service import create_and_push_notification  # ← adjust path if different


# ------------- DELETE MESSAGE -----------------

async def delete_message_service(
    db: AsyncSession,
    message_id: UUID,
    current_user_id: str,
) -> Message:

    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalar_one_or_none()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if str(msg.sender_id) != str(current_user_id):
        raise HTTPException(status_code=403, detail="You cannot delete this message")

    # 🔥 Delete child reactions first (required by your FK setup)
    await db.execute(
        MessageReaction.__table__.delete().where(
            MessageReaction.message_id == message_id
        )
    )

    # Now delete the message
    await db.delete(msg)
    await db.commit()

    return msg



# ------------- REACTIONS -----------------

async def upsert_reaction_service(
    db: AsyncSession,
    message_id: UUID,
    user_id: str,
    reaction_value: str,
) -> Tuple[MessageReaction, Message, bool]:
    """
    Create or update a reaction for a message from a given user.
    Returns (reaction_row, message, changed_flag).

    - If same reaction already exists → no change, no notification.
    - If new or changed → commit + send notification to message sender.
    """

    # Ensure message exists
    msg_result = await db.execute(select(Message).where(Message.id == message_id))
    msg: Message | None = msg_result.scalar_one_or_none()

    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Prevent self-farming: user cannot react to their own message
    if str(msg.sender_id) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot react to your own message",
        )

    # Check existing reaction
    existing_q = await db.execute(
        select(MessageReaction).where(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
        )
    )
    existing = existing_q.scalar_one_or_none()

    changed = False

    if existing:
        if existing.reaction == reaction_value:
            # Nothing changed
            return existing, msg, False
        existing.reaction = reaction_value
        reaction_row = existing
        changed = True
    else:
        reaction_row = MessageReaction(
            message_id=message_id,
            user_id=user_id,
            reaction=reaction_value,
        )
        db.add(reaction_row)
        changed = True

    if changed:
        await db.commit()
        await db.refresh(reaction_row)

        # Notify original sender that someone reacted
        await create_and_push_notification(
            db=db,
            recipient_id=str(msg.sender_id),      # who gets notification (message author)
            notif_type="message_reaction",
            actor_id=str(user_id),                # who reacted
            target_id=str(msg.receiver_id),       # other participant in chat (optional but valid)
            conversation_id=None,                 # you don't have conversation_id yet
            message_preview=msg.content,
            meta={"reaction": reaction_value},
        )

    return reaction_row, msg, changed



async def remove_reaction_service(
    db: AsyncSession,
    message_id: UUID,
    user_id: str,
) -> Tuple[bool, Message | None]:
    """
    Remove user's reaction from a message.
    Returns (removed_flag, message_obj).
    """

    # Ensure message exists
    msg_result = await db.execute(select(Message).where(Message.id == message_id))
    msg: Message | None = msg_result.scalar_one_or_none()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Find reaction
    existing_q = await db.execute(
        select(MessageReaction).where(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
        )
    )
    reaction = existing_q.scalar_one_or_none()

    if not reaction:
        return False, msg

    await db.delete(reaction)
    await db.commit()

    # No notification for removal (keeps it quiet)
    return True, msg