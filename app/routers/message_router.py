# router/message_router.py


from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from sqlalchemy import select
from models.message_model import Message
from services.ai_service import (
    generate_ai_replies_service,
    send_ai_reply_service,
    send_user_message_service,
)
from utils.socket_manager import manager
from db.session import async_session
from datetime import datetime

router = APIRouter()


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    """
    Main WebSocket handler for chat.
    Handles:
      - Message delivery and persistence
      - Offline redelivery
      - Delivery + read receipts
      - AI message suggestions
      - Graceful disconnects
    """

    await manager.connect(user_id, websocket)

    # -----------------------------
    # 1️⃣ Deliver any pending messages
    # -----------------------------
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
                        print(f"⚠️ Socket closed mid-delivery for {user_id}")
                        break

                    payload = {
                        "type": "message",
                        "message_id": str(msg.id),
                        "sender_id": str(msg.sender_id),
                        "receiver_id": str(msg.receiver_id),
                        "content": msg.content,
                        "timestamp": msg.created_at.isoformat() if msg.created_at else None,
                    }

                    sent = await manager.send_personal_message(user_id, payload)
                    if sent:
                        msg.is_delivered = True
                        delivered_count += 1

                        # Notify sender of delivery
                        await manager.send_personal_message(str(msg.sender_id), {
                            "type": "delivery_receipt",
                            "message_id": str(msg.id),
                        })
                    else:
                        print(f"📭 Receiver {user_id} has no active sockets for pending message.")

                except Exception as e:
                    print(f"⚠️ Could not deliver pending {msg.id} → {user_id}: {e}")

            if delivered_count > 0:
                await db.commit()
                print(f"📬 Delivered {delivered_count} pending → {user_id}")

        except Exception as e:
            print(f"❌ Error delivering pending for {user_id}: {e}")

    # -----------------------------
    # 2️⃣ Main WebSocket event loop
    # -----------------------------
    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                print(f"🔌 {user_id} disconnected (receive_json)")
                break
            except Exception as e:
                print(f"⚠️ JSON decode or receive error from {user_id}: {e}")
                if websocket.client_state != WebSocketState.CONNECTED:
                    break
                continue

            if not isinstance(data, dict):
                print(f"⚠️ Invalid data (not dict) from {user_id}: {data}")
                continue

            event_type = data.get("type")
            if not event_type:
                await websocket.send_json({"type": "error", "message": "Missing event type"})
                continue

            print(f"📥 {user_id} → {event_type}: {data}")

            # -----------------------------
            # Message sending
            # -----------------------------
            if event_type == "message":
                try:
                    receiver_id = data["receiver_id"]
                    content = data["content"].strip()
                    if not content:
                        await websocket.send_json({
                            "type": "error", "message": "Empty message content"
                        })
                        continue

                    async with async_session() as db:
                        new_msg = await send_user_message_service(
                            db, sender_id=user_id, receiver_id=receiver_id, content=content
                        )

                        payload = {
                            "type": "message",
                            "message_id": str(new_msg.id),
                            "sender_id": str(user_id),
                            "receiver_id": str(receiver_id),
                            "content": content,
                            "timestamp": new_msg.created_at.isoformat() if new_msg.created_at else None,
                        }

                        sent = await manager.send_personal_message(receiver_id, payload)
                        if sent:
                            new_msg.is_delivered = True
                            await db.commit()
                            await db.refresh(new_msg)

                            await manager.send_personal_message(user_id, {
                                "type": "delivery_receipt",
                                "message_id": str(new_msg.id),
                            })
                            print(f"✅ Delivered instantly {new_msg.id}")
                        else:
                            print(f"📭 Receiver {receiver_id} offline → queued")

                except Exception as e:
                    print(f"💥 Error sending message from {user_id}: {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})

            # -----------------------------
            # AI Suggestions Request
            # -----------------------------
            elif event_type == "ai_request":
                try:
                    original_msg_id = data["original_message_id"]
                    tone = data.get("tone", "flirty")

                    async with async_session() as db:
                        result = await db.execute(select(Message).where(Message.id == original_msg_id))
                        msg = result.scalar_one_or_none()

                        if not msg:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Original message not found"
                            })
                            continue

                        ai_response = await generate_ai_replies_service(db, user_id, msg.id, tone)
                        await websocket.send_json({
                            "type": "ai_suggestions",
                            "original_message_id": original_msg_id,
                            "replies": ai_response.get("replies", []),
                            "remaining_today": ai_response.get("remaining_today"),
                        })
                except Exception as e:
                    print(f"💥 AI request failed for {user_id}: {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})

            # -----------------------------
            # AI Reply Sent
            # -----------------------------
            elif event_type == "ai_selected":
                try:
                    receiver_id = data["receiver_id"]
                    content = data["content"]

                    async with async_session() as db:
                        new_msg = await send_ai_reply_service(
                            db, sender_id=user_id, receiver_id=receiver_id, content=content
                        )

                        payload = {
                            "type": "message",
                            "message_id": str(new_msg.id),
                            "sender_id": str(user_id),
                            "receiver_id": str(receiver_id),
                            "content": content,
                            "timestamp": new_msg.created_at.isoformat() if new_msg.created_at else None,
                        }

                        sent = await manager.send_personal_message(receiver_id, payload)
                        if sent:
                            new_msg.is_delivered = True
                            await db.commit()
                            await db.refresh(new_msg)
                            await manager.send_personal_message(user_id, {
                                "type": "delivery_receipt",
                                "message_id": str(new_msg.id),
                            })
                            print(f"✅ AI reply {new_msg.id} delivered")
                        else:
                            print(f"📭 AI reply queued for {receiver_id}")

                except Exception as e:
                    print(f"💥 AI reply error for {user_id}: {e}")
                    await websocket.send_json({"type": "error", "message": str(e)})

            # -----------------------------
            # Read Receipt
            # -----------------------------
            elif event_type == "read_receipt":
                try:
                    ids = data.get("message_ids", [])
                    async with async_session() as db:
                        updated = 0
                        for msg_id in ids:
                            result = await db.execute(select(Message).where(Message.id == msg_id))
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
                            print(f"👁️ {updated} read for {user_id}")
                except Exception as e:
                    print(f"💥 Read receipt error {user_id}: {e}")

            # -----------------------------
            # Unknown event
            # -----------------------------
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown event type: {event_type}"
                })

    # -----------------------------
    # 3️⃣ Disconnect Handling
    # -----------------------------
    except WebSocketDisconnect:
        print(f"🔌 {user_id} disconnected cleanly")
    except Exception as e:
        print(f"💥 Fatal WS error for {user_id}: {e}")
    finally:
        await manager.disconnect(user_id, websocket)
        print(f"🧹 Cleaned up WS session for {user_id}")