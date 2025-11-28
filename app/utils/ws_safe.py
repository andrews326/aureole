# utils/ws_safe.py


import uuid
from datetime import datetime
from enum import Enum

def to_safe(v):
    if v is None:
        return None

    if isinstance(v, uuid.UUID):
        return str(v)

    if isinstance(v, datetime):
        return v.isoformat()

    if isinstance(v, Enum):
        return v.value

    if isinstance(v, dict):
        return {k: to_safe(v2) for k, v2 in v.items()}

    if isinstance(v, list):
        return [to_safe(i) for i in v]

    return v


def safe_payload(d: dict):
    return {k: to_safe(v) for k, v in d.items()}
