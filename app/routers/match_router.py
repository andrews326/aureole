from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List
from services.recommend_service import (
    get_proximity_first, get_compatibility_first_recommendations,
    get_fresh_faces_recommendations, get_boosted_tier_recommendations,
    get_age_filtered_recommendations
    )
from services.notification_service import fetch_user_media_map
from fastapi import Query
from utils.deps import get_db, get_current_user
from utils.match_logic import compute_compatibility_score
from schemas.match_schema import MatchFilters, MatchResponse
from models.profile_model import Profile
from models.user_model import User, UserMedia
from models.match_model import Match, Swipe

router = APIRouter(prefix="/matches", tags=["Matches"])




@router.get("/recommendations", response_model=List[MatchResponse])
async def recommend_matches(
    filters: MatchFilters = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1️⃣ Ensure current user has embedding
    user_profile = await db.scalar(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    if not user_profile or user_profile.embedding is None:
        raise HTTPException(
            status_code=400,
            detail="User profile not ready. Please complete profile creation first.",
        )

    # 2️⃣ Fetch candidate users (exclude self, hidden)
    candidates_stmt = (
        select(
            User.id,
            User.full_name,
            User.age,
            User.bio,
            User.latitude,
            User.longitude,
            (1 - (Profile.embedding.l2_distance(user_profile.embedding))).label(
                "similarity"
            ),
        )
        .join(Profile, Profile.user_id == User.id)
        .where(
            User.id != current_user.id,
            User.is_profile_hidden.is_(False),
            User.age >= filters.min_age,
            User.age <= filters.max_age,
            Profile.embedding.isnot(None),
        )
        # keep random order so we don't always see the same people
        .order_by(func.random())
    )

    result = await db.execute(candidates_stmt)
    candidates = result.all()

    if not candidates:
        return []

    # ------------------------------------------------
    # 3️⃣ Build list of candidate IDs (as UUID)
    # ------------------------------------------------
    candidate_ids = [r.id for r in candidates]

    # ------------------------------------------------
    # 4️⃣ Exclude users you ALREADY RIGHT-SWIPED
    #     swiper_id = current_user.id
    #     liked = True
    #     undone = False
    # ------------------------------------------------
    swipe_res = await db.execute(
        select(Swipe.swiped_id).where(
            Swipe.swiper_id == current_user.id,
            Swipe.liked.is_(True),
            Swipe.undone.is_(False),
            Swipe.swiped_id.in_(candidate_ids),
        )
    )
    right_swiped_ids = {row[0] for row in swipe_res}

    # ------------------------------------------------
    # 5️⃣ Exclude users you ALREADY MATCHED WITH
    #     Any active match where you are on either side
    # ------------------------------------------------
    match_res = await db.execute(
        select(Match.user_id, Match.target_id).where(
            Match.is_active.is_(True),
            or_(
                Match.user_id == current_user.id,
                Match.target_id == current_user.id,
            ),
        )
    )

    matched_ids = set()
    for uid, tid in match_res:
        # If current user is user_id, add target_id; if current user is target_id, add user_id
        if uid == current_user.id and tid is not None:
            matched_ids.add(tid)
        if tid == current_user.id and uid is not None:
            matched_ids.add(uid)

    # ------------------------------------------------
    # 6️⃣ Build exclusion set (as string IDs for easy compare with uid)
    # ------------------------------------------------
    excluded_ids = {str(x) for x in (right_swiped_ids | matched_ids)}

    # ------------------------------------------------
    # 7️⃣ Bulk media lookup for ALL images of each candidate
    # ------------------------------------------------
    media_stmt = (
        select(UserMedia.user_id, UserMedia.file_path)
        .where(
            UserMedia.user_id.in_(candidate_ids),
            UserMedia.media_type == "image",
        )
        .order_by(UserMedia.created_at)
    )

    media_res = await db.execute(media_stmt)
    media_rows = media_res.all()

    media_map = {}
    for uid, file_url in media_rows:
        uid_str = str(uid)
        media_map.setdefault(uid_str, []).append(file_url)

    # ------------------------------------------------
    # 8️⃣ Build match response (respect limit, skip excluded)
    # ------------------------------------------------
    matches: List[MatchResponse] = []

    for r in candidates:
        uid = str(r.id)

        # 🚫 Skip if already swiped right or already matched
        if uid in excluded_ids:
            continue

        # distance helper object
        class TempUser:
            def __init__(self, lat, lon):
                self.latitude = lat
                self.longitude = lon

        candidate_obj = TempUser(r.latitude, r.longitude)
        current_user_obj = TempUser(current_user.latitude, current_user.longitude)

        score_data = compute_compatibility_score(
            current_user_obj,
            candidate_obj,
            embedding_similarity=r.similarity,
            max_distance_km=filters.max_distance_km,
        )

        # ✅ Normalize ALL photo URLs
        raw_photos = media_map.get(uid, [])
        normalized_photos = [
            (
                url
                if url.startswith("http")
                else f"http://127.0.0.1:8000/{url.lstrip('/')}"
            )
            for url in raw_photos
        ]

        matches.append(
            MatchResponse(
                user_id=uid,
                full_name=r.full_name or "",
                age=r.age or 0,
                bio=r.bio or "",
                match_score=score_data["match_score"],
                distance_km=score_data["distance_km"],
                photos=normalized_photos,  # 🔥 ALL gallery photos, not just [:1]
            )
        )

        if len(matches) >= filters.limit:
            break

    # keep your original sort behavior
    matches.sort(key=lambda x: x.match_score, reverse=True)
    return matches





# routes/match_routes.py (add inside your existing router)

@router.get("/recommendations/proximity", response_model=List[MatchResponse])
async def proximity_first_route(
    radius_km: float = 5.0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Proximity-first mode:
    Shows nearby users with AI similarity + recency + optional premium boost.
    """
    return await get_proximity_first(
        db=db,
        current_user=current_user,
        radius_km=radius_km,
        limit=limit
    )



@router.get("/recommendations/compatibility", response_model=List[MatchResponse])
async def compatibility_first_route(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20
):
    """
    Mode 1: Compatibility-first
    Returns AI-personality matches ignoring location.
    """
    matches = await get_compatibility_first_recommendations(
        db=db,
        current_user=current_user,
        limit=limit
    )
    return matches


@router.get("/recommendations/fresh", response_model=List[MatchResponse])
async def fresh_faces_route(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20
):
    """
    Mode 3: Fresh Faces
    Returns random recently active users (last 24 hours).
    """
    return await get_fresh_faces_recommendations(
        db=db,
        current_user=current_user,
        limit=limit
    )


@router.get("/recommendations/boosted", response_model=List[MatchResponse])
async def boosted_tier_route(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20
):
    """
    Mode 4: Boosted Tier
    Premium users appear slightly higher in compatibility lists.
    """
    return await get_boosted_tier_recommendations(db, current_user, limit)



@router.get("/recommendations/filtered", response_model=List[MatchResponse])
async def age_filtered_route(
    limit: int = 20,
    min_age: int = 18,
    max_age: int = 100,
    gender: List[str] = Query(None),   # 👈 NEW
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_age_filtered_recommendations(
        db=db,
        current_user=current_user,
        limit=limit,
        min_age=min_age,
        max_age=max_age,
        gender=gender,
    )
