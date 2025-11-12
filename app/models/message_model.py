# models/message_model.py

import uuid
from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from .base import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receiver_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_flagged = Column(Boolean, default=False)
    flagged_reason = Column(Text, nullable=True)
    is_delivered = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Add indexes
Index('idx_messages_conversation', Message.sender_id, Message.receiver_id, Message.created_at)
Index('idx_messages_unread', Message.receiver_id, Message.is_read)
