from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from openai import AsyncOpenAI  # ✅ async client
from uuid import UUID
import json

from db.session import get_db
from models.profile_model import Profile
from utils.config import settings
from utils.deps import get_current_user  # returns User object

router = APIRouter(prefix="/profile", tags=["Profile AI Processing"])

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENAI_API_KEY
    )  # ✅ async


async def run_ai_profile_process(db: AsyncSession, user):
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()

    if not profile or not profile.raw_prompts:
        raise ValueError("Profile prompts missing")

    raw = profile.raw_prompts

    system_prompt = """You are a dating profile expert. Analyze the user's inputs and return ONLY a JSON object with this exact structure:
    {
      "summary": "A natural, friendly 2-3 line dating bio summarizing who they are and what they seek.",
      "preferences": {
        "interests": ["list", "of", "interests"],
        "values": ["list", "of", "core", "values"],
        "dealbreakers": ["list", "of", "non-negotiables"]
      }
    }"""

    user_prompt = f"""
    About me: {raw.get('about', '')}
    Looking for: {raw.get('looking_for', '')}
    Likes: {raw.get('likes', '')}
    Dealbreakers: {raw.get('dealbreakers', '')}
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



@router.post("/ai-process")
async def process_profile_ai(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await run_ai_profile_process(db, current_user)
    return {"msg": "Profile processed successfully", **result}
