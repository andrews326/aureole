# aureole/app/main.py
import os
import mimetypes, os
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from utils.config import settings
from routers.auth_router import router as auth_router
from routers.profile_router_01 import router as profile_setup_router
from routers.profile_router_02 import router as profile_verification_router
from routers.ai_router import router as ai_router
from routers.profile_router_03 import router as ai_2_router
from routers.profile_router_04 import router as profile_location_router
from routers.match_router import router as match_router
from routers.user_router import router as user
from routers.message_router import router as ws_router
from routers.report_router import router as report_router
from routers.interaction_router import router as interaction_router
from routers.coversation_router import router as conversation_router
from routers.notification_ws import router as notification_ws_router
from routers.profile import router as profile
from routers.insights_router import router as insight_router
from routers.media_router import router as media_router
from routers.rtc_router import router as rtc_router
from web.signal.router import router as call_router



app = FastAPI(
    title="Aureole Dating App API",
    description="AI-powered, safe, and authentic dating app backend",
    version="0.1.0",
    docs_url="/docs",        # Swagger UI
    redoc_url="/redoc",      # ReDoc
)

# Ensure directory exists
os.makedirs("uploads", exist_ok=True)

# Mount uploads as static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/uploads/chat/{filename}")
async def serve_chat_audio(filename: str):
    path = os.path.join("uploads/chat", filename)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    # Critical fix for OPUS audio
    if filename.endswith(".webm"):
        return FileResponse(path, media_type="audio/webm; codecs=opus")

    # Normal fallback for other media
    mime, _ = mimetypes.guess_type(path)
    return FileResponse(path, media_type=mime or "application/octet-stream")



origins = "http://localhost:5173"

# Fetch the 'PRODUCTION_IP' environment variable
ip = os.getenv("PRODUCTION_IP")

# If the 'PRODUCTION_IP' is set, update origins to use the new IP
if ip:
    ip = ip.strip()
    origins = f"http://{ip}:5173"

# Add CORS middleware to the app with the configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "Aureole backend is running!",
        "environment": "local"
    }

# You'll add routers here later, e.g.:

# -------------------------
# Include Routers
# -------------------------
app.include_router(auth_router, prefix="/api/v1")
app.include_router(profile_setup_router, prefix="/api/v1")
app.include_router(profile_verification_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(profile_location_router, prefix="/api/v1")
app.include_router(match_router, prefix="/api/v1")
app.include_router(user, prefix="/api/v1")
app.include_router(ai_2_router, prefix="/api/v1")
app.include_router(report_router, prefix="/api/v1")
app.include_router(interaction_router, prefix="/api/v1")
app.include_router(conversation_router, prefix="/api/v1")
app.include_router(profile, prefix="/api/v1")
app.include_router(insight_router, prefix="/api/v1")
app.include_router(media_router, prefix="/api/v1")
app.include_router(rtc_router, prefix="/api/v1")

# Include WebSocket router
app.include_router(ws_router)
app.include_router(notification_ws_router)
app.include_router(call_router)
