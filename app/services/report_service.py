# report_service.py


import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.report_model import Report
from models.message_model import Message
from models.user_model import User

async def report_user_service(db: AsyncSession, reporter_id: str, reported_id: str, payload):
    if reporter_id == reported_id:
        raise HTTPException(status_code=400, detail="You cannot report yourself.")

    # Check target exists
    target_user = await db.scalar(select(User).where(User.id == reported_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    report = Report(
        id=uuid.uuid4(),
        reporter_id=reporter_id,
        reported_id=reported_id,
        message_id=None,
        reason=payload.reason,
        description=payload.description or "",
        status="pending"
    )
    db.add(report)
    await db.commit()

    return {"message": "User reported successfully."}


async def report_message_service(db: AsyncSession, reporter_id: str, message_id: str, payload):
    msg = await db.scalar(select(Message).where(Message.id == message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    # Only sender or receiver can report
    if reporter_id not in [str(msg.sender_id), str(msg.receiver_id)]:
        raise HTTPException(status_code=403, detail="You cannot report this message.")

    report = Report(
        id=uuid.uuid4(),
        reporter_id=reporter_id,
        reported_id=msg.sender_id,
        message_id=msg.id,
        reason=payload.reason,
        description=payload.description or f"Reported message: {msg.content}",
        status="pending"
    )
    msg.is_flagged = True
    msg.flagged_reason = payload.reason

    db.add(report)
    await db.commit()

    return {"message": "Message reported successfully."}