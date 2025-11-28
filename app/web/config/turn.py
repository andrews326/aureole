# web/config/turn.py

from dataclasses import dataclass
from typing import List, Dict, Optional

from utils.config import settings


@dataclass
class TurnServerConfig:
    urls: List[str]
    username: Optional[str] = None
    credential: Optional[str] = None


def _get_turn_from_settings() -> Optional[TurnServerConfig]:
    """
    Read TURN config from your settings.

    Add these to your settings (env / config):

        TURN_URL=turn:your-turn-host:3478
        TURN_USERNAME=youruser
        TURN_PASSWORD=yourpass

    You can support comma-separated TURN_URL values if you want.
    """
    url = getattr(settings, "TURN_URL", None)
    if not url:
        return None

    username = getattr(settings, "TURN_USERNAME", None)
    password = getattr(settings, "TURN_PASSWORD", None)

    urls = [u.strip() for u in url.split(",") if u.strip()]
    if not urls:
        return None

    return TurnServerConfig(urls=urls, username=username, credential=password)


def get_ice_servers() -> List[Dict]:
    """
    Returns ICE servers list compatible with both browser RTCPeerConnection
    and aiortc RTCConfiguration.
    """
    servers: List[Dict] = []

    # Always add at least a STUN server for NAT discovery
    servers.append({"urls": "stun:stun.l.google.com:19302"})

    turn_cfg = _get_turn_from_settings()
    if turn_cfg:
        turn_entry: Dict = {"urls": turn_cfg.urls}
        if turn_cfg.username:
            turn_entry["username"] = turn_cfg.username
        if turn_cfg.credential:
            turn_entry["credential"] = turn_cfg.credential
        servers.append(turn_entry)

    return servers