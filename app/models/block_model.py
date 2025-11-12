# models/block_models.py

# For blocking and hiding users
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from .base import Base

class UserBlock(Base):
    __tablename__ = "user_blocks"

    id = Column(Integer, primary_key=True)
    blocker_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    blocked_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    hide_only = Column(Boolean, default=False)  # True = hide (user stays active), False = block
    created_at = Column(DateTime(timezone=True), server_default=func.now())