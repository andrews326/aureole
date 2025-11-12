# models/subscription_model.py


import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from .base import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    provider = Column(String, default="stripe")                # or "razorpay"
    provider_subscription_id = Column(String, unique=True)     # Stripe/Razorpay reference

    tier = Column(String, default="premium")                   # e.g., free / premium / platinum
    status = Column(String, default="active")                  # active / canceled / expired

    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)

    canceled_at = Column(DateTime(timezone=True), nullable=True)  # if user cancels early
    renewed_at = Column(DateTime(timezone=True), nullable=True)   # if auto-renewed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())