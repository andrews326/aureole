# models/report_models.py

import uuid
from sqlalchemy import Column, Text, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from .base import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    reporter_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reported_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    reason = Column(String(100), nullable=False)      # short category label
    description = Column(Text, nullable=True)         # user’s optional explanation

    status = Column(String(20), default="pending")    # pending / reviewed / dismissed
    reviewed_at = Column(DateTime(timezone=True), nullable=True)  # when moderator acts

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Optional message reference (for chat reports)
    message_id = Column(PG_UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True)

