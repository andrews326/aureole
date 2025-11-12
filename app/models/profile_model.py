# models/profile_model.py

# AI-generated profile understanding
from sqlalchemy import Column, Text, JSON, ForeignKey,Integer
from pgvector.sqlalchemy import VECTOR # type: ignore 
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from .base import Base
import uuid
from sqlalchemy import DateTime
from sqlalchemy.sql import func


class Profile(Base):
    __tablename__ = "profiles"

    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    raw_prompts = Column(JSON, nullable=True)        # e.g., {"about": "...", "looking_for": "..."}
    ai_summary = Column(Text, nullable=True)         # Natural language summary by OpenAI
    preferences = Column(JSON, nullable=True)        # Structured: {"interests": [...], "values": [...], "dealbreakers": [...]}
    embedding = Column(VECTOR(1536), nullable=True)  # OpenAI text-embedding-3-small
    last_edited_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)


class AIUsage(Base):
    __tablename__ = "ai_usage"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), nullable=False)
    ai_generated_count = Column(Integer, default=0)   # count for the day
    last_generated_at = Column(DateTime(timezone=True), server_default=func.now())