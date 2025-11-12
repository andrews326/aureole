# services/recommend_service.py


import math
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from utils.location import haversine_distance
from models.user_model import User
from models.profile_model import Profile
from schemas.match_schema import MatchResponse
from utils.match_logic import compute_compatibility_score


async def get_proximity_first(
    db: AsyncSession,
    current_user: User,
    radius_km: float = 5.0,
    limit: int = 20,
) -> list[MatchResponse]:
    """
    Proximity-first recommendation:
    50% proximity, 40% embedding similarity, 10% recency, + optional premium boost
    """

    if not (current_user.latitude and current_user.longitude):
        return []

    current_profile = await db.scalar(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    if not current_profile or current_profile.embedding is None:
        return []

    lat, lon = current_user.latitude, current_user.longitude

    # Bounding box for SQL filtering
    lat_range = radius_km / 111
    lon_range = radius_km / (111 * (math.cos(lat * 3.141592653589793 / 180)))

    stmt = (
        select(
            User.id,
            User.full_name,
            User.age,
            User.bio,
            User.latitude,
            User.longitude,
            User.last_active,
            User.premium_tier,
            User.gender,
            User.preference,
            (1 - Profile.embedding.l2_distance(current_profile.embedding)).label("similarity"),
        )
        .join(Profile, Profile.user_id == User.id)
        .where(
            User.id != current_user.id,
            User.is_active.is_(True),
            User.is_profile_hidden.is_(False),
            User.latitude.between(lat - lat_range, lat + lat_range),
            User.longitude.between(lon - lon_range, lon + lon_range),
            Profile.embedding.isnot(None),
        )
        .limit(500)
    )

    result = await db.execute(stmt)
    candidates = result.all()
    if not candidates:
        return []

    matches = []
    now = datetime.now(timezone.utc)

    for c in candidates:
        # Compute exact distance
        distance_km = haversine_distance(lat, lon, c.latitude, c.longitude)
        if distance_km > radius_km:
            continue

        # Weighted scores
        proximity_score = max(0, 1 - (distance_km / radius_km))
        embedding_score = max(0, min(1, c.similarity))
        recency_hours = (now - c.last_active).total_seconds() / 3600
        recency_score = max(0.5, min(1.0, 1 - recency_hours / 24))

        base_score = (proximity_score * 0.5) + (embedding_score * 0.4) + (recency_score * 0.1)

        # Apply premium boost
        final_score = apply_premium_boost(base_score, candidate_tier=c.premium_tier, current_tier=current_user.premium_tier)

        matches.append(
            MatchResponse(
                user_id=str(c.id),
                full_name=c.full_name or "",
                age=c.age or 0,
                bio=c.bio or "",
                match_score=math.floor(final_score * 100),
                distance_km=round(distance_km, 2),
            )
        )

    # Sort by final score and slice top N
    matches.sort(key=lambda x: x.match_score, reverse=True)
    return matches[:limit]


# -------------------------------
# 🔹 Helper: Compute preference alignment
# -------------------------------
def compute_preference_alignment(current_user: User, candidate: User) -> float:
    """Return 0.0–1.0 alignment score based on gender, preference, and age gap."""
    score = 0.0
    total = 0

    # gender match
    if current_user.preference and candidate.gender:
        total += 1
        if candidate.gender.lower() in current_user.preference.lower():
            score += 1

    # mutual orientation match
    if candidate.preference and current_user.gender:
        total += 1
        if current_user.gender.lower() in candidate.preference.lower():
            score += 1

    # age compatibility (soft check)
    if current_user.age and candidate.age:
        total += 1
        age_gap = abs(current_user.age - candidate.age)
        if age_gap <= 5:
            score += 1
        elif age_gap <= 10:
            score += 0.5

    return score / total if total > 0 else 0.5  # neutral fallback


# -------------------------------
# 🔹 Service: Compatibility-first recommendation
# -------------------------------
async def get_compatibility_first_recommendations(
    db: AsyncSession,
    current_user: User,
    limit: int = 20
) -> list[MatchResponse]:
    """
    Mode 1: Compatibility-first
    Uses 70% AI embedding similarity + 30% preference alignment.
    Ignores location entirely.
    """
    # 1️⃣ Get current user's embedding
    current_profile = await db.scalar(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    if not current_profile or current_profile.embedding is None:
        return []

    # 2️⃣ Fetch other active profiles
    stmt = (
        select(
            User.id,
            User.full_name,
            User.age,
            User.gender,
            User.preference,
            User.bio,
            (1 - Profile.embedding.l2_distance(current_profile.embedding)).label("similarity"),
        )
        .join(Profile, Profile.user_id == User.id)
        .where(
            User.id != current_user.id,
            User.is_active.is_(True),
            User.is_profile_hidden.is_(False),
            Profile.embedding.isnot(None),
        )
        .order_by(desc("similarity"))
        .limit(limit * 3)
    )

    result = await db.execute(stmt)
    candidates = result.all()
    matches = []

    # 3️⃣ Combine embedding + preference weights
    for c in candidates:
        pref_score = compute_preference_alignment(current_user, c)
        embedding_score = max(0, min(1, c.similarity))
        final_score = (embedding_score * 0.7) + (pref_score * 0.3)

        matches.append(
            MatchResponse(
                user_id=str(c.id),
                full_name=c.full_name or "",
                age=c.age or 0,
                bio=c.bio or "",
                match_score=int(final_score * 100),
                distance_km=None,
            )
        )

    matches.sort(key=lambda x: x.match_score, reverse=True)
    return matches[:limit]


# -------------------------------
# 🔹 Service: Fresh Faces (active within 24h)
# -------------------------------
async def get_fresh_faces_recommendations(
    db: AsyncSession,
    current_user: User,
    limit: int = 20,
) -> list[MatchResponse]:
    """
    Mode 3 – Fresh Faces
    Randomly show active users (last 24 hours),
    ignoring compatibility and location.
    """

    # 1️⃣ Define activity window
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)

    # 2️⃣ Query active, visible users
    stmt = (
        select(
            User.id,
            User.full_name,
            User.age,
            User.bio,
            User.last_active,
        )
        .where(
            User.id != current_user.id,
            User.is_active.is_(True),
            User.is_profile_hidden.is_(False),
            User.last_active >= cutoff_time,
        )
        .order_by(func.random())  # random shuffle
        .limit(limit)
    )

    result = await db.execute(stmt)
    candidates = result.all()

    # 3️⃣ Map to MatchResponse — neutral match score
    matches = [
        MatchResponse(
            user_id=str(c.id),
            full_name=c.full_name or "",
            age=c.age or 0,
            bio=c.bio or "",
            match_score=60,   # arbitrary neutral score
            distance_km=None,
        )
        for c in candidates
    ]

    return matches


def apply_premium_boost(base_score: float, candidate_tier: int, current_tier: int) -> float:
    """
    Boost visibility if either user is premium.
    - Premium users get +10% visibility weight.
    - Mutual premium = slightly higher bump (optional).
    """
    if candidate_tier > 0 and current_tier > 0:
        return min(1.0, base_score * 1.15)
    elif candidate_tier > 0 or current_tier > 0:
        return min(1.0, base_score * 1.10)
    return base_score



async def get_boosted_tier_recommendations(
    db: AsyncSession,
    current_user: User,
    limit: int = 20,
) -> list[MatchResponse]:
    """
    Mode 4 – Boosted Tier
    Same as compatibility-first but premium users get +10% visibility weight.
    """

    current_profile = await db.scalar(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    if not current_profile or current_profile.embedding is None:
        return []

    stmt = (
        select(
            User.id,
            User.full_name,
            User.age,
            User.bio,
            User.gender,
            User.preference,
            User.premium_tier,
            (1 - Profile.embedding.l2_distance(current_profile.embedding)).label("similarity"),
        )
        .join(Profile, Profile.user_id == User.id)
        .where(
            User.id != current_user.id,
            User.is_active.is_(True),
            User.is_profile_hidden.is_(False),
            Profile.embedding.isnot(None),
        )
        .order_by(desc("similarity"))
        .limit(limit * 3)
    )

    result = await db.execute(stmt)
    candidates = result.all()
    matches = []

    for c in candidates:
        pref_score = compute_preference_alignment(current_user, c)
        embedding_score = max(0, min(1, c.similarity))
        base_score = (embedding_score * 0.7) + (pref_score * 0.3)

        # 🎯 Apply visibility boost
        boosted_score = apply_premium_boost(
            base_score,
            candidate_tier=c.premium_tier or 0,
            current_tier=current_user.premium_tier or 0,
        )

        matches.append(
            MatchResponse(
                user_id=str(c.id),
                full_name=c.full_name or "",
                age=c.age or 0,
                bio=c.bio or "",
                match_score=int(boosted_score * 100),
                distance_km=None,
            )
        )

    matches.sort(key=lambda x: x.match_score, reverse=True)
    return matches[:limit]


async def get_age_filtered_recommendations(
    db: AsyncSession,
    current_user: User,
    limit: int = 20,
    min_age: int = 18,
    max_age: int = 100,
) -> list[MatchResponse]:
    """
    Age-filtered recommendation (no location):
    40% embedding similarity, 60% recency, optional premium boost.
    """

    current_profile = await db.scalar(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    if not current_profile or current_profile.embedding is None:
        return []

    stmt = (
        select(
            User.id,
            User.full_name,
            User.age,
            User.bio,
            User.last_active,
            User.premium_tier,
            (1 - Profile.embedding.l2_distance(current_profile.embedding)).label("similarity"),
        )
        .join(Profile, Profile.user_id == User.id)
        .where(
            User.id != current_user.id,
            User.is_active.is_(True),
            User.is_profile_hidden.is_(False),
            User.age.between(min_age, max_age),
            Profile.embedding.isnot(None),
        )
        .limit(500)
    )

    result = await db.execute(stmt)
    candidates = result.all()
    if not candidates:
        return []

    matches = []
    now = datetime.now(timezone.utc)

    for c in candidates:
        embedding_score = max(0, min(1, c.similarity))
        recency_hours = (now - c.last_active).total_seconds() / 3600
        recency_score = max(0.5, min(1.0, 1 - recency_hours / 24))

        base_score = (embedding_score * 0.4) + (recency_score * 0.6)
        final_score = apply_premium_boost(base_score, candidate_tier=c.premium_tier, current_tier=current_user.premium_tier)

        matches.append(
            MatchResponse(
                user_id=str(c.id),
                full_name=c.full_name or "",
                age=c.age or 0,
                bio=c.bio or "",
                match_score=math.floor(final_score * 100),
                distance_km=None,  # location ignored
            )
        )

    matches.sort(key=lambda x: x.match_score, reverse=True)
    return matches[:limit]