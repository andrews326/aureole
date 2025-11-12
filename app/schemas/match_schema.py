# schemas/match_schema.py


from pydantic import BaseModel
from typing import List, Optional

class MatchFilters(BaseModel):
    max_distance_km: float = 50.0
    min_age: int = 18
    max_age: int = 100
    limit: int = 20

class MatchResponse(BaseModel):
    user_id: str
    full_name: str
    age: int
    bio: str
    match_score: int  # 0-100
    distance_km: Optional[float] = None