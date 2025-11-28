# models/message_model.py  (updated)

import uuid
from sqlalchemy import (
    Column, Text, Boolean, DateTime, ForeignKey, 
    Index, Enum, JSON, Integer, String
    )
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import enum

class MessageTypeEnum(str, enum.Enum):
    text = "text"
    image = "image"
    audio = "audio"
    video = "video"
    system = "system"

class Message(Base):
    __tablename__ = "messages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receiver_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # for backward compatibility keep content; for media messages content may be caption or empty
    content = Column(Text, nullable=True)

    # new: message type and optional media reference
    message_type = Column(Enum(MessageTypeEnum, name="message_type_enum"), nullable=False, default=MessageTypeEnum.text)
    media_id = Column(PG_UUID(as_uuid=True), ForeignKey("chat_media.id"), nullable=True)

    # flexible metadata (client-side preview / legacy fields)
    meta = Column(JSON, nullable=True)

    is_flagged = Column(Boolean, default=False)
    flagged_reason = Column(Text, nullable=True)
    is_delivered = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    reactions = relationship(
        "MessageReaction",
        backref="message",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

# Indexes for fast conversation queries
Index('idx_messages_conversation', Message.sender_id, Message.receiver_id, Message.created_at)
Index('idx_messages_unread', Message.receiver_id, Message.is_read)



class ChatMedia(Base):
    __tablename__ = "chat_media"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploader_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_path = Column(String, nullable=False)            # normalized URL or storage path
    file_name = Column(String, nullable=True)
    file_type = Column(String(32), nullable=False)        # e.g. "image/jpeg", "audio/mpeg"
    kind = Column(String(16), nullable=False)             # "image" / "audio" / "video" / "file"
    size_bytes = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)                # for images / video
    height = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)          # for audio/video
    thumb_path = Column(String, nullable=True)            # small preview image URL
    processed = Column(Boolean, default=False, nullable=False) # post-processing done (thumbs, compress)
    meta = Column(JSON, nullable=True)                    # optional moderation, exif, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


  
class MessageReaction(Base):
    __tablename__ = "message_reactions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    message_id = Column(PG_UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # who reacted
    reaction = Column(String(20), nullable=False)   # "good" | "bad" | "offensive" | etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_message_reactions_unique", "message_id", "user_id", unique=True),
    )
