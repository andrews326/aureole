# app/services/ai_service

import json
import uuid
from fastapi import HTTPException
from datetime import datetime, timezone
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.profile_model import Profile, AIUsage
from utils.premium_utils import is_premium_user
from models.message_model import Message
from models.user_model import Notification, User
from utils.config import settings
from services.notification_service import create_and_push_notification

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENAI_API_KEY
)

MAX_DAILY_FREE = 3

async def run_ai_profile_process(db: AsyncSession, user):
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()

    if not profile or not profile.raw_prompts:
        raise ValueError("Profile prompts missing")

    raw = profile.raw_prompts

    system_prompt = """
        You are a dating profile expert. Analyze the user's inputs and return ONLY a JSON object with the following structure:
       {
        "summary": "A natural, friendly 2-3 line dating bio summarizing the user's personality, lifestyle, and what they are looking for.",
        "preferences": {
           "interests": ["list of interests, hobbies, activities, even if not explicitly stated"],
           "values": ["core beliefs or values that might guide the user"],
           "dealbreakers": ["things they likely prefer to avoid or cannot compromise on"]
        },
        "conversation_starters": ["3 engaging questions or topics to start a conversation with this user, based on their interests and values"]
        }

        Even if some fields in the user input are missing or sparse, infer intelligently and creatively. Make the suggestions realistic, friendly, and diverse.
        """

    user_prompt = f"""
             User profile inputs:
             About me: {raw.get('about', '')}
             Looking for: {raw.get('looking_for', '')}
             Likes: {raw.get('likes', '')}
             Dealbreakers: {raw.get('dealbreakers', '')}

             If a field is missing, infer reasonable details from what is provided.
            """


    chat_response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        timeout=30
    )

    ai_output = chat_response.choices[0].message.content
    ai_data = json.loads(ai_output)

    summary = ai_data["summary"]
    preferences = ai_data["preferences"]

    emb_text = (
        f"About: {raw.get('about', '')} "
        f"Looking for: {raw.get('looking_for', '')} "
        f"Interests: {', '.join(preferences.get('interests', []))} "
        f"Values: {', '.join(preferences.get('values', []))} "
        f"Dealbreakers: {', '.join(preferences.get('dealbreakers', []))}"
    )

    emb_response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=emb_text,
        encoding_format="float"
    )

    profile.ai_summary = summary
    profile.preferences = preferences
    profile.embedding = emb_response.data[0].embedding

    await db.commit()
    return {"summary": summary, "preferences": preferences}



async def generate_ai_replies_service(db: AsyncSession, user_id: str, message_id: str, tone: str):
    # 1. Check user and message validity
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    message = (await db.execute(select(Message).where(Message.id == message_id))).scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # 2. Check premium status
    premium = await is_premium_user(db, user_id)

    # 3. Enforce daily limit for non-premium
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(AIUsage).where(AIUsage.user_id == user_id, AIUsage.last_generated_at >= today_start)
    )
    usage = result.scalar_one_or_none()

    if not premium and usage and usage.ai_generated_count >= MAX_DAILY_FREE:
        raise HTTPException(status_code=403, detail="Daily AI reply limit reached. Upgrade to premium.")

    # 4. Generate replies via OpenAI
    system_prompt = (
        f"You are a helpful dating chat assistant. "
        f"Provide 3 {tone} replies in JSON format: {{'replies': ['','', '']}}"
    )

    chat_response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Incoming message: {message.content}"}
        ],
        response_format={"type": "json_object"},
        timeout=30
    )

    ai_output = chat_response.choices[0].message.content
    ai_data = json.loads(ai_output)
    replies = ai_data.get("replies", [])

    # 5. Update usage
    if not premium:
        if usage:
            usage.ai_generated_count += 1
            usage.last_generated_at = datetime.now(timezone.utc)
        else:
            db.add(AIUsage(user_id=user_id, ai_generated_count=1, last_generated_at=datetime.now(timezone.utc)))
        await db.commit()

    remaining = None
    if not premium:
        remaining = MAX_DAILY_FREE - (usage.ai_generated_count if usage else 1)

    return {"replies": replies, "remaining_today": remaining}



async def send_ai_reply_service(
    db: AsyncSession,
    sender_id: str,
    receiver_id: str,
    content: str
) -> Message:
    new_msg = Message(
        id=uuid.uuid4(),
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content,
        is_delivered=False,
        is_read=False
    )
    db.add(new_msg)
    await db.commit()
    await db.refresh(new_msg)

    # ✅ Also notify receiver in real time
    await create_and_push_notification(
        db=db,
        recipient_id=receiver_id,
        notif_type="message",
        actor_id=sender_id,
        message_preview=content,
    )

    return new_msg





async def get_ai_usage_service(db: AsyncSession, user_id: str):
    premium = await is_premium_user(db, user_id)
    if premium:
        return {
            "daily_limit": 0,
            "used_today": 0,
            "remaining": 0,
            "is_premium": True
        }

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(AIUsage).where(AIUsage.user_id == user_id, AIUsage.last_generated_at >= today_start)
    )
    usage = result.scalar_one_or_none()
    used = usage.ai_generated_count if usage else 0

    return {
        "daily_limit": MAX_DAILY_FREE,
        "used_today": used,
        "remaining": max(0, MAX_DAILY_FREE - used),
        "is_premium": False
    }


# ---------------------------------------------
# NORMAL USER MESSAGE SERVICE
# ---------------------------------------------
async def send_user_message_service(
    db: AsyncSession,
    sender_id: str,
    receiver_id: str,
    content: str
):
    new_msg = Message(
        id=uuid.uuid4(),
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content,
        is_delivered=False,
        is_read=False
    )
    db.add(new_msg)
    await db.commit()
    await db.refresh(new_msg)

    # ✅ Push real-time notification (and DB record)
    await create_and_push_notification(
        db=db,
        recipient_id=receiver_id,
        notif_type="message",
        actor_id=sender_id,
        message_preview=content,
    )

    return new_msg