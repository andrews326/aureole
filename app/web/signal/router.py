# web/signal/router.py

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketDisconnect, WebSocketState
from jose import jwt, JWTError
from sqlalchemy import select

from db.session import async_session
from models.user_model import User
from utils.config import settings
from web.signal.manager import call_signal_manager
from web.signal.schema import (
    parse_call_message,
    CallInviteMessage,
    CallAnswerMessage,
    CallRejectMessage,
    CallCancelMessage,
    CallEndMessage,
    CallHeartbeatMessage,
    WebRTCOfferMessage,
    WebRTCAnswerMessage,
    IceCandidateMessage,
)
from web.services.call_service import call_service, CallServiceError

router = APIRouter()

ALGORITHM = settings.ALGORITHM
SECRET_KEY = settings.SECRET_KEY


async def authenticate_websocket(websocket: WebSocket):
    protocols = websocket.scope.get("subprotocols") or []
    if not protocols:
        return None, "Missing authentication token (no subprotocol provided)"

    token = protocols[0].strip()
    if not token:
        return None, "Empty authentication token"

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None, "Invalid or expired token"

    user_id = payload.get("user_id")
    if not user_id:
        return None, "Token missing user_id"

    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

    if not user:
        return None, "User not found"

    if not user.is_active:
        return None, "User is inactive"

    return user, None


@router.websocket("/ws/call/{user_id}")
async def websocket_call(websocket: WebSocket, user_id: str):
    # 1) AUTH BEFORE ACCEPT
    user, err = await authenticate_websocket(websocket)
    if err or not user:
        await websocket.close(code=1008, reason=err or "Unauthorized")
        return

    real_user_id = str(user.id)
    if real_user_id != user_id:
        await websocket.close(
            code=1008,
            reason="User mismatch between token and path",
        )
        return

    await websocket.accept()

    # 2) REGISTER CONNECTION
    await call_signal_manager.register_connection(real_user_id, websocket)

    await call_signal_manager.send_to_user(
        real_user_id,
        {
            "type": "call.init",
            "user_id": real_user_id,
            "state": (await call_signal_manager.get_user_state(real_user_id)).value,
            "active_call_id": await call_signal_manager.get_user_call_id(real_user_id),
        },
    )

    try:
        # 3) MAIN LOOP
        while websocket.client_state == WebSocketState.CONNECTED:
            try:
                raw = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                await call_signal_manager.send_error(
                    websocket,
                    code="invalid_json",
                    message="Invalid JSON payload",
                )
                continue

            if not isinstance(raw, dict):
                await call_signal_manager.send_error(
                    websocket,
                    code="invalid_payload",
                    message="Payload must be an object",
                )
                continue

            try:
                msg = parse_call_message(raw)
            except ValueError as e:
                await call_signal_manager.send_error(
                    websocket,
                    code="invalid_message",
                    message=str(e),
                )
                continue

            print(f"📥 CALL {real_user_id} → {msg.type}: {raw}")

            try:
                # 4) DISPATCH BY MESSAGE TYPE
                if isinstance(msg, CallInviteMessage):
                    ack = await call_service.invite(real_user_id, msg)
                    await call_signal_manager.send_to_user(real_user_id, ack)

                elif isinstance(msg, CallAnswerMessage):
                    ack = await call_service.answer(real_user_id, msg)
                    await call_signal_manager.send_to_user(real_user_id, ack)

                elif isinstance(msg, CallRejectMessage):
                    ack = await call_service.reject(real_user_id, msg)
                    await call_signal_manager.send_to_user(real_user_id, ack)

                elif isinstance(msg, CallCancelMessage):
                    ack = await call_service.cancel(real_user_id, msg)
                    await call_signal_manager.send_to_user(real_user_id, ack)

                elif isinstance(msg, CallEndMessage):
                    ack = await call_service.end(real_user_id, msg)
                    await call_signal_manager.send_to_user(real_user_id, ack)

                elif isinstance(msg, WebRTCOfferMessage):
                    await call_service.relay_offer(real_user_id, msg)

                elif isinstance(msg, WebRTCAnswerMessage):
                    await call_service.relay_answer(real_user_id, msg)

                elif isinstance(msg, IceCandidateMessage):
                    await call_service.relay_ice(real_user_id, msg)

                elif isinstance(msg, CallHeartbeatMessage):
                    # Keep it simple: just ACK. You could update last-seen here.
                    await call_signal_manager.send_to_user(
                        real_user_id,
                        {"type": "call.heartbeat_ack", "call_id": msg.call_id},
                    )

                else:
                    await call_signal_manager.send_error(
                        websocket,
                        code="unknown_type",
                        message=f"Unhandled message type: {msg.type}",
                    )

            except CallServiceError as e:
                await call_signal_manager.send_error(
                    websocket,
                    code=e.code,
                    message=e.message,
                )
            except Exception as e:
                # Safety net – never crash the WS loop
                await call_signal_manager.send_error(
                    websocket,
                    code="internal_error",
                    message="Internal error in call handling",
                )
                # You can log e / traceback here.

    finally:
        # 5) CLEANUP: unregister and let service handle any active call
        await call_signal_manager.unregister_connection(real_user_id, websocket)
        await call_service.handle_disconnect(real_user_id)