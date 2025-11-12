# routes/notification_ws.py

from starlette.websockets import WebSocketState
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from utils.socket_manager import manager
from sqlalchemy import select, update
from datetime import datetime, timezone
from db.session import async_session
from models.user_model import Notification

router = APIRouter(prefix="/ws", tags=["WebSocket"])

@router.websocket("/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str, token: str = Query(None)):
    # 1️⃣ Accept and register
    await manager.connect(user_id, websocket)
    print(f"✅ [WS] Notification channel established for {user_id}")

    # 2️⃣ Replay only NOT-YET-DELIVERED notifications
    try:
        async with async_session() as db:
            result = await db.execute(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.notified_at.is_(None)
                )
            )
            pending = result.scalars().all()

            if pending:
                print(f"📬 Replaying {len(pending)} pending notifications for {user_id}")
                now = datetime.now(timezone.utc)

                for notif in pending:
                    try:
                        await websocket.send_json({
                            "event": "notification",
                            "data": notif.payload
                        })
                        # mark as notified
                        notif.notified_at = now
                        db.add(notif)
                    except Exception as e:
                        print(f"⚠️ Failed to replay notification for {user_id}: {e}")

                await db.commit()

    except Exception as e:
        print(f"⚠️ Replay error for {user_id}: {e}")

    # 3️⃣ Keep socket alive (heartbeat loop)
    try:
        while True:
            msg = await websocket.receive_text()
            print(f"🔄 [WS] Ping from {user_id}: {msg}")

            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.send_json({
                    "event": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        print(f"❌ [WS] Notification channel closed for {user_id}")

    except Exception as e:
        manager.disconnect(user_id, websocket)
        print(f"⚠️ [WS] Error for {user_id}: {e}")