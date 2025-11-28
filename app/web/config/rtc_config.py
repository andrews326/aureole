# web/config/rtc_config.py

from typing import Dict, Any

from aiortc import RTCConfiguration, RTCIceServer # type: ignore

from web.config.turn import get_ice_servers


def get_client_rtc_config() -> Dict[str, Any]:
    """
    Config that frontend can consume directly for new RTCPeerConnection(config).
    """
    return {
        "iceServers": get_ice_servers(),
        "iceTransportPolicy": "all",
    }


def get_server_rtc_config() -> RTCConfiguration:
    """
    If/when you use aiortc as a media peer, this builds RTCConfiguration.
    Right now, your server isn't in the media path, but this is ready.
    """
    ice_servers = [
        RTCIceServer(**entry) for entry in get_ice_servers()
    ]
    return RTCConfiguration(iceServers=ice_servers)
