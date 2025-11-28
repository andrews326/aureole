# app/routers/rtc_router.py


from fastapi import APIRouter
from web.config.rtc_config import get_client_rtc_config

router = APIRouter()

@router.get("/rtc/config")
async def rtc_config():
    return get_client_rtc_config()