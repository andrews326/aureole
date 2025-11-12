

from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class AIReplyRequest(BaseModel):
    message_id: UUID
    tone: Optional[str] = "friendly"

class AIReplyResponse(BaseModel):
    replies: List[str]
    remaining_today: Optional[int] = None

class AISendReplyRequest(BaseModel):
    receiver_id: UUID
    content: str

class AISendReplyResponse(BaseModel):
    status: str
    message_id: UUID
    notified: bool

class AIUsageResponse(BaseModel):
    daily_limit: int
    used_today: int
    remaining: int
    is_premium: bool