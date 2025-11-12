# schemas/ profile_schema


from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime


class MediaOut(BaseModel):
    id: UUID
    file_path: str
    media_type: str

    class Config:
        orm_mode = True


class UserProfileOut(BaseModel):
    id: UUID
    full_name: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    bio: Optional[str]
    ai_summary: Optional[str]
    is_verified: bool
    media: List[MediaOut] = []
    stats: Optional[dict] = None

    class Config:
        orm_mode = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str]
    bio: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    preference: Optional[str]
    relationship_status: Optional[str]
    raw_prompts: Optional[dict]