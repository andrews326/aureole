# web/signal/schema.py

from __future__ import annotations

from typing import Optional, Literal, Union
from pydantic import BaseModel, Field, field_validator


# ────────── Common types ──────────

MediaType = Literal["audio", "video"]


class BaseCallMessage(BaseModel):
    type: str = Field(..., description="Discriminator for message type")


# ────────── Call control messages ──────────

class CallInviteMessage(BaseCallMessage):
    type: Literal["call.invite"] = "call.invite"
    target_id: str = Field(..., description="User ID of callee")
    media_type: MediaType = "audio"
    context_id: Optional[str] = Field(
        None, description="Optional context (e.g. conversation id)"
    )

    @field_validator("target_id")
    def target_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("target_id required")
        return v


class CallAnswerMessage(BaseCallMessage):
    type: Literal["call.answer"] = "call.answer"
    call_id: str


class CallRejectMessage(BaseCallMessage):
    type: Literal["call.reject"] = "call.reject"
    call_id: str
    reason: Optional[str] = None


class CallCancelMessage(BaseCallMessage):
    type: Literal["call.cancel"] = "call.cancel"
    call_id: str


class CallEndMessage(BaseCallMessage):
    type: Literal["call.end"] = "call.end"
    call_id: str
    reason: Optional[str] = None


class CallHeartbeatMessage(BaseCallMessage):
    type: Literal["call.heartbeat"] = "call.heartbeat"
    call_id: Optional[str] = None


# ────────── WebRTC signaling messages ──────────

class WebRTCOfferMessage(BaseCallMessage):
    type: Literal["webrtc.offer"] = "webrtc.offer"
    call_id: str
    sdp: str
    sdp_type: Literal["offer", "rollback"] = "offer"


class WebRTCAnswerMessage(BaseCallMessage):
    type: Literal["webrtc.answer"] = "webrtc.answer"
    call_id: str
    sdp: str
    sdp_type: Literal["answer"] = "answer"


class IceCandidateMessage(BaseCallMessage):
    type: Literal["webrtc.ice_candidate"] = "webrtc.ice_candidate"
    call_id: str
    candidate: str
    sdp_mid: Optional[str] = None
    sdp_mline_index: Optional[int] = None


CallMessage = Union[
    CallInviteMessage,
    CallAnswerMessage,
    CallRejectMessage,
    CallCancelMessage,
    CallEndMessage,
    CallHeartbeatMessage,
    WebRTCOfferMessage,
    WebRTCAnswerMessage,
    IceCandidateMessage,
]


def parse_call_message(raw: dict) -> CallMessage:
    """
    Centralized, type-safe parser for call messages.
    Raises ValueError on unknown/invalid structures.
    """
    msg_type = raw.get("type")
    if not msg_type:
        raise ValueError("Missing 'type' field")

    mapping = {
        "call.invite": CallInviteMessage,
        "call.answer": CallAnswerMessage,
        "call.reject": CallRejectMessage,
        "call.cancel": CallCancelMessage,
        "call.end": CallEndMessage,
        "call.heartbeat": CallHeartbeatMessage,
        "webrtc.offer": WebRTCOfferMessage,
        "webrtc.answer": WebRTCAnswerMessage,
        "webrtc.ice_candidate": IceCandidateMessage,
    }

    model = mapping.get(msg_type)
    if not model:
        raise ValueError(f"Unknown call message type: {msg_type}")

    return model(**raw)