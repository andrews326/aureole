# schemas/user_schema.py


from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class UserCreate(BaseModel):
    email: str
    phone: str = None
    password: str
    

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: str  # UUID as string

class UserOut(BaseModel):
    id: UUID
    email: str | None = None
    verified: bool | None = None

    class Config:
        orm_mode = True
        from_attributes = True
