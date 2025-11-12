# report_schema.py

from pydantic import BaseModel
from typing import Optional

class ReportCreate(BaseModel):
    reason: str
    description: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    reporter_id: str
    reported_id: str
    message_id: Optional[str]
    reason: str
    description: Optional[str]
    status: str

    class Config:
        orm_mode = True
