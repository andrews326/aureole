# test.py


import asyncio
import websockets
import json

# Use your real user UUIDs
USER_A = "0073f1db-5306-4b3c-aec5-cd345478064c"
USER_B = "75a4beac-8df1-4d7c-9d40-2e16eb1b3eda"

WS_URL_A = f"ws://127.0.0.1:8000/ws/chat/{USER_A}"
WS_URL_B = f"ws://127.0.0.1:8000/ws/chat/{USER_B}"

# ===== CONFIGURATION =====
USE_AI_FLOW = False  # 🔁 Set to True to test AI, False for plain messages only
# =========================

async def simulate_chat():
    message_id_holder = {}
    ai_suggestions_holder = {}

    async def recv(ws, name):
        try:
            while True:
                raw = await ws.recv()
                data = json.loads(raw)
                print(f"📩 {name} RECEIVED: {data}")

                if name == "B" and data.get("type") == "message" and data.get("sender_id") == USER_A:
                    message_id_holder["id"] = data["message_id"]

                if name == "B" and data.get("type") == "ai_suggestions":
                    ai_suggestions_holder.update(data)

        except websockets.exceptions.ConnectionClosedOK:
            print(f"🔌 {name} connection closed cleanly")
        except Exception as e:
            print(f"💥 {name} error: {e}")

    print("🚀 Starting WebSocket connections...")
    async with websockets.connect(WS_URL_A) as ws_a, websockets.connect(WS_URL_B) as ws_b:
        task_a = asyncio.create_task(recv(ws_a, "A"))
        task_b = asyncio.create_task(recv(ws_b, "B"))

        try:
            # === STEP 1: A sends a custom message to B ===
            custom_msg = "Hey!! it's working, right?? 😊"
            print(f"\n📤 A → B: Sending custom message: '{custom_msg}'")
            await ws_a.send(json.dumps({
                "type": "message",
                "receiver_id": USER_B,
                "content": custom_msg
            }))

            # Wait for B to receive it
            for _ in range(50):
                if "id" in message_id_holder:
                    break
                await asyncio.sleep(0.1)
            else:
                raise TimeoutError("❌ B did not receive A's message!")

            print("✅ B received A's message.")

            if USE_AI_FLOW:
                # === STEP 2: B requests AI replies ===
                msg_id = message_id_holder["id"]
                print(f"\n🧠 B → AI: Requesting suggestions for message {msg_id}...")
                await ws_b.send(json.dumps({
                    "type": "ai_request",
                    "original_message_id": msg_id,
                    "tone": "warm"
                }))

                # Wait for AI
                for _ in range(50):
                    if "replies" in ai_suggestions_holder:
                        break
                    await asyncio.sleep(0.1)
                else:
                    raise TimeoutError("❌ AI suggestions not received!")

                ai_reply = ai_suggestions_holder["replies"][0]
                print(f"💬 Selected AI reply: '{ai_reply}'")

                # === STEP 3: B sends AI reply to A ===
                print("\n📤 B → A: Sending AI reply...")
                await ws_b.send(json.dumps({
                    "type": "ai_selected",
                    "receiver_id": USER_A,
                    "content": ai_reply
                }))
                await asyncio.sleep(1)
                print("✅ AI reply sent and received.")

            else:
                # === OPTIONAL: B replies manually (no AI) ===
                reply_msg = "Hi back! Yes it's working on the backend🌟"
                print(f"\n📤 B → A: Sending manual reply: '{reply_msg}'")
                await ws_b.send(json.dumps({
                    "type": "message",
                    "receiver_id": USER_A,
                    "content": reply_msg
                }))
                await asyncio.sleep(1)
                print("✅ Manual reply sent and received.")

            print("\n🎉 Full chat flow completed successfully!")

        finally:
            task_a.cancel()
            task_b.cancel()
            await asyncio.gather(task_a, task_b, return_exceptions=True)

if __name__ == "__main__":
    try:
        asyncio.run(simulate_chat())
    except Exception as e:
        print(f"\n🔥 Test failed: {e}")
        raise