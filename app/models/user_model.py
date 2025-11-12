# amodels/user_model.py


from sqlalchemy import (
    ForeignKey, Column, String, 
    Boolean, Integer, Float, 
    DateTime, Text, JSON, Index
    )
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
import uuid
from .base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    hashed_password = Column(String, nullable=False)

    # Profile basics
    full_name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)

    # Predefined but flexible
    gender = Column(String, nullable=True)          # options + custom text
    bio = Column(Text, nullable=True)               # short tagline with preset or custom
    preference = Column(String, nullable=True)      # e.g., straight, gay, bi, custom
    relationship_status = Column(String, nullable=True)  # e.g., single, dating, custom

    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Verification & Safety
    is_verified = Column(Boolean, default=False)
    verified_photo_path = Column(String, nullable=True)

    # Premium & Monetization
    premium_tier = Column(Integer, default=0) # e.g., [0: Not Applicable, 1: Premium Tier-1, 2: Premium Tier-2]
    premium_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Activity & Privacy
    is_active = Column(Boolean, default=True)
    is_profile_hidden = Column(Boolean, default=False)
    last_active = Column(DateTime(timezone=True), server_default=func.now())

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())



class UserMedia(Base):
    __tablename__ = "user_media"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_path = Column(String, nullable=False)
    media_type = Column(String, default="image")  # "image" or "video"
    is_verified = Column(Boolean, default=False)  # true for live/selfie verification
    created_at = Column(DateTime(timezone=True), server_default=func.now())



class VerificationAttempt(Base):
    __tablename__ = "verification_attempts"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    photo_path = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending / passed / failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The owner of this notification (who will receive it)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Canonical type (one of: like, view, match, message, unmatch, block, report, system)
    type = Column(String(32), nullable=False, index=True)

    # Denormalized quick fields to ease querying & UI rendering
    actor_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)    # who caused the notification
    actor_name = Column(String, nullable=True)    # optional friendly name snapshot
    target_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)   # secondary user reference (e.g., match partner)
    conversation_id = Column(PG_UUID(as_uuid=True), nullable=True)                    # for message type
    message_preview = Column(String(255), nullable=True)

    # Flexible JSON for extra metadata
    payload = Column(JSON, nullable=True)

    # 👇 new field
    notified_at = Column(DateTime(timezone=True), nullable=True, index=True)

    is_read = Column(Boolean, default=False, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_notifications_user_read", "user_id", "is_read"),
    )

