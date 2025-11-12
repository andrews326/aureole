# routers/report_router.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from services.report_service import (
    report_user_service,
    report_message_service,
)
from schemas.report_schema import ReportCreate
from utils.deps import get_current_user
from db.session import get_db
from models.user_model import User

router = APIRouter(prefix="/report", tags=["Report"])

@router.post("/user/{reported_id}")
async def report_user(
    reported_id: str,
    payload: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await report_user_service(db, current_user.id, reported_id, payload)


@router.post("/message/{message_id}")
async def report_message(
    message_id: str,
    payload: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await report_message_service(db, current_user.id, message_id, payload)
