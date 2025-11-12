# models/match_model.py


import uuid
from sqlalchemy import (
    Column, Boolean, DateTime, 
    ForeignKey, Float, Index,
    String
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from .base import Base


# -----------------------------
#  MATCH TABLE
# -----------------------------
class Match(Base):
    __tablename__ = "matches"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Directional relationship
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)    # The one who liked
    target_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # The one being liked

    # AI compatibility score
    score = Column(Float, nullable=False)  # e.g., 0.0–1.0 similarity or % match

    # Match state
    is_mutual = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Unmatch tracking
    unmatched_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(String, nullable=True)  # e.g., "manual_unmatch", "block", "report", "undo_swipe"

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    matched_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_match_user_target", "user_id", "target_id", unique=True),
    )


# -----------------------------
#  SWIPE TABLE
# -----------------------------
class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    swiper_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    swiped_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    liked = Column(Boolean, nullable=False)   # True = right swipe, False = left swipe
    undone = Column(Boolean, default=False)   # True if rewinded

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_swipe_swiper_swiped", "swiper_id", "swiped_id", unique=True),
    )


# -----------------------------
#  VIEW TABLE
# -----------------------------
class View(Base):
    __tablename__ = "views"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    viewer_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    viewed_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_view_viewer_id", "viewer_id"),
        Index("idx_view_viewed_id", "viewed_id"),
    )


# -----------------------------
#  LIKE TABLE
# -----------------------------
class Like(Base):
    __tablename__ = "likes"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    liker_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    liked_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_like_liker_liked", "liker_id", "liked_id", unique=True),
    )
