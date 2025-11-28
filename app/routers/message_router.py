# router/message_router.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from sqlalchemy import select
from models.message_model import Message, ChatMedia
from services.ai_service import (
    generate_ai_replies_service,
    send_ai_reply_service,
    send_user_message_service,
)
from utils.socket_manager import manager
from utils.ws_safe import safe_payload
from db.session import async_session
from datetime import datetime

router = APIRouter()


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    """
    Main WebSocket handler for chat.
    """

    await manager.connect(user_id, websocket)

    # -------------------------------------------------------
    # 1️⃣ Deliver pending messages (OFFLINE → ONLINE)
    # -------------------------------------------------------
    async with async_session() as db:
        try:
            pending_result = await db.execute(
                select(Message)
                .where(Message.receiver_id == user_id, Message.is_delivered == False)
                .order_by(Message.created_at)
            )
            pending_messages = pending_result.scalars().all()

            delivered_count = 0

            for msg in pending_messages:
                try:
                    if websocket.client_state != WebSocketState.CONNECTED:
                        break

                    # fetch media paths if needed
                    media_url = None
                    thumb_url = None

                    if msg.media_id:
                        m = (
                            await db.execute(
                                select(ChatMedia).where(ChatMedia.id == msg.media_id)
                            )
                        ).scalar_one_or_none()
                        if m:
                            media_url = m.file_path
                            thumb_url = m.thumb_path

                    payload = safe_payload({
                        "type": "message",
                        "message_id": str(msg.id),
                        "sender_id": str(msg.sender_id),
                        "receiver_id": str(msg.receiver_id),
                        "content": msg.content,
                        "timestamp": msg.created_at.isoformat() if msg.created_at else None,
                        "message_type": msg.message_type.value,
                        "media_id": str(msg.media_id) if msg.media_id else None,
                        "media_url": media_url,
                        "thumb_url": thumb_url,
                    })

                    sent = await manager.send_personal_message(
                        str(msg.receiver_id), payload
                    )

                    if sent:
                        msg.is_delivered = True
                        delivered_count += 1

                        await manager.send_personal_message(str(msg.sender_id), {
                            "type": "delivery_receipt",
                            "message_id": str(msg.id),
                        })

                except Exception as e:
                    print(f"⚠️ Error delivering pending message {msg.id}: {e}")

            if delivered_count:
                await db.commit()

        except Exception as e:
            print(f"❌ Pending delivery error: {e}")

    # -------------------------------------------------------
    # 2️⃣ MAIN EVENT LOOP
    # -------------------------------------------------------
    try:
        while websocket.client_state == WebSocketState.CONNECTED:

            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                continue

            if not isinstance(data, dict):
                continue

            event_type = data.get("type")
            if not event_type:
                await websocket.send_json({"type": "error", "message": "Missing type"})
                continue

            print(f"📥 {user_id} → {event_type}: {data}")

            # ---------------------------------------------------
            # 🎯 Send normal or media message
            # ---------------------------------------------------
            if event_type == "message":
                try:
                    receiver_id = data["receiver_id"]
                    message_type = data.get("message_type", "text")
                    content = (data.get("content") or "").strip()
                    media_id = data.get("media_id")

                    if message_type == "text" and not content:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Empty text message"
                        })
                        continue

                    async with async_session() as db:
                        new_msg = await send_user_message_service(
                            db,
                            sender_id=user_id,
                            receiver_id=receiver_id,
                            content=content,
                            message_type=message_type,
                            media_id=media_id,
                        )

                        # fetch media paths
                        media_url = None
                        thumb_url = None

                        if media_id:
                            m = (
                                await db.execute(
                                    select(ChatMedia).where(ChatMedia.id == media_id)
                                )
                            ).scalar_one_or_none()
                            if m:
                                media_url = m.file_path
                                thumb_url = m.thumb_path

                        payload = safe_payload({
                            "type": "message",
                            "message_id": str(new_msg.id),
                            "sender_id": str(user_id),
                            "receiver_id": str(receiver_id),
                            "content": content,
                            "message_type": message_type,
                            "media_id": media_id,
                            "media_url": media_url,
                            "thumb_url": thumb_url,
                            "timestamp": new_msg.created_at.isoformat() if new_msg.created_at else None,
                        })

                        sent = await manager.send_personal_message(
                            str(receiver_id), payload
                        )

                        if sent:
                            new_msg.is_delivered = True
                            await db.commit()
                            await db.refresh(new_msg)

                            await manager.send_personal_message(str(user_id), {
                                "type": "delivery_receipt",
                                "message_id": str(new_msg.id),
                            })

                        else:
                            print(f"📭 Receiver {receiver_id} offline → queued")

                except Exception as e:
                    print(f"💥 Error sending message: {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})

            # ---------------------------------------------------
            # Other existing handlers (UNCHANGED)
            # ---------------------------------------------------
            elif event_type == "ai_request":
                try:
                    original_msg_id = data["original_message_id"]
                    tone = data.get("tone", "flirty")

                    async with async_session() as db:
                        result = await db.execute(
                            select(Message).where(Message.id == original_msg_id)
                        )
                        msg = result.scalar_one_or_none()

                        if not msg:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Original message not found"
                            })
                            continue

                        ai_response = await generate_ai_replies_service(
                            db, user_id, msg.id, tone)

                        await websocket.send_json({
                            "type": "ai_suggestions",
                            "original_message_id": original_msg_id,
                            "replies": ai_response.get("replies", []),
                            "remaining_today": ai_response.get("remaining_today"),
                        })

                except Exception as e:
                    print(f"💥 AI request failed: {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})

            elif event_type == "ai_selected":
                try:
                    receiver_id = data["receiver_id"]
                    content = data["content"]

                    async with async_session() as db:
                        new_msg = await send_ai_reply_service(
                            db, sender_id=user_id, receiver_id=receiver_id, content=content
                        )

                        payload = safe_payload({
                            "type": "message",
                            "message_id": str(new_msg.id),
                            "sender_id": str(user_id),
                            "receiver_id": str(receiver_id),
                            "content": content,
                            "timestamp": new_msg.created_at.isoformat() if new_msg.created_at else None,
                        })

                        sent = await manager.send_personal_message(str(receiver_id), payload)

                        if sent:
                            new_msg.is_delivered = True
                            await db.commit()
                            await db.refresh(new_msg)

                            await manager.send_personal_message(str(user_id), {
                                "type": "delivery_receipt",
                                "message_id": str(new_msg.id),
                            })

                except Exception as e:
                    print(f"💥 AI reply failed: {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})

            elif event_type == "read_receipt":
                try:
                    ids = data.get("message_ids", [])
                    async with async_session() as db:
                        updated = 0
                        for msg_id in ids:
                            result = await db.execute(
                                select(Message).where(Message.id == msg_id)
                            )
                            msg = result.scalar_one_or_none()

                            if msg and msg.receiver_id == user_id and not msg.is_read:
                                msg.is_read = True
                                updated += 1

                                await manager.send_personal_message(str(msg.sender_id), {
                                    "type": "read_receipt",
                                    "message_ids": [str(msg.id)],
                                })

                        if updated:
                            await db.commit()

                except Exception as e:
                    print(f"💥 Read receipt error: {e}")

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown event type: {event_type}"
                })

    # -------------------------------------------------------
    # 3️⃣ Cleanup
    # -------------------------------------------------------
    except WebSocketDisconnect:
        pass

    finally:
        await manager.disconnect(user_id, websocket)