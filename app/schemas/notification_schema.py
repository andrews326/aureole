# schemas/notification_schema.py


from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class NotificationPayload(BaseModel):
    id: str
    type: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    target_id: Optional[str] = None
    conversation_id: Optional[str] = None
    message_preview: Optional[str] = None
    meta: Dict[str, Any] = {}
    created_at: datetime

class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    target_id: Optional[str] = None
    conversation_id: Optional[str] = None
    message_preview: Optional[str] = None
    payload: Optional[NotificationPayload] = None
    is_read: bool
    created_at: datetime
