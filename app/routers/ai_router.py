# routers/ ai-router.py


from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from schemas.ai_schema import *
from utils.deps import *
from services.ai_service import (
    generate_ai_replies_service, send_ai_reply_service, get_ai_usage_service,
    run_ai_profile_process
)

router = APIRouter(prefix="/ai", tags=["AI Replies"])


@router.post("/replies/generate", response_model=AIReplyResponse)
async def generate_ai_replies_route(payload: AIReplyRequest, db: AsyncSession = Depends(get_db), user_id: str = None):
    return await generate_ai_replies_service(db, user_id, str(payload.message_id), payload.tone)


@router.post("/replies/send", response_model=AISendReplyResponse)
async def send_ai_reply_route(payload: AISendReplyRequest, db: AsyncSession = Depends(get_db), user_id: str = None):
    return await send_ai_reply_service(db, user_id, str(payload.receiver_id), payload.content)


@router.get("/usage", response_model=AIUsageResponse)
async def get_ai_usage_route(db: AsyncSession = Depends(get_db), user_id: str = None):
    return await get_ai_usage_service(db, user_id)

@router.post("/ai-process")
async def process_profile_ai(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await run_ai_profile_process(db, current_user)
    return {"msg": "Profile processed successfully", **result}


