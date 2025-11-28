# web/services/call_service.py

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional, Tuple

from web.signal.manager import call_signal_manager, UserCallState
from web.signal.schema import (
    CallInviteMessage,
    CallAnswerMessage,
    CallRejectMessage,
    CallCancelMessage,
    CallEndMessage,
    WebRTCOfferMessage,
    WebRTCAnswerMessage,
    IceCandidateMessage,
)

from web.rtc.pc_manager import RTCConnection



class CallState(str, Enum):
    RINGING = "ringing"
    ACTIVE = "active"
    ENDED = "ended"
    REJECTED = "rejected"
    CANCELED = "canceled"
    FAILED = "failed"


@dataclass
class Call:
    id: str
    caller_id: str
    callee_id: str
    media_type: str
    state: CallState = CallState.RINGING
    reason: Optional[str] = None


class CallServiceError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class CallService:
    """
    In-memory call lifecycle manager.

    - Tracks calls & state transitions.
    - Talks to CallSignalManager to update user states and push events.
    - Does NOT touch aiortc yet: WebRTC messages are forwarded to peers
      so you can start with P2P. aiortc integration/recording comes next layer.
    """

    def __init__(self) -> None:
        # call_id -> Call
        self._calls: Dict[str, Call] = {}
        self._lock = asyncio.Lock()
        self._rtc: Dict[Tuple[str, str], RTCConnection] = {}


    # ────────── helpers ──────────

    async def _get_call(self, call_id: str) -> Call:
        async with self._lock:
            call = self._calls.get(call_id)
        if not call:
            raise CallServiceError("call_not_found", "Call not found")
        return call

    async def _save_call(self, call: Call) -> None:
        async with self._lock:
            self._calls[call.id] = call

    async def _delete_call(self, call_id: str) -> None:
        async with self._lock:
            self._calls.pop(call_id, None)

    # ────────── lifecycle ops ──────────

    async def invite(self, caller_id: str, msg: CallInviteMessage) -> dict:
        if msg.target_id == caller_id:
            raise CallServiceError("invalid_target", "Cannot call yourself")

        target_id = msg.target_id

        # Serialize invites to the same callee to avoid race.
        async with call_signal_manager.user_lock(target_id):
            if await call_signal_manager.is_user_busy(target_id):
                raise CallServiceError("user_busy", "User is busy in another call")

            if not await call_signal_manager.is_online(target_id):
                raise CallServiceError("user_offline", "User is offline or unreachable")

            call_id = str(uuid.uuid4())
            call = Call(
                id=call_id,
                caller_id=caller_id,
                callee_id=target_id,
                media_type=msg.media_type,
            )
            await self._save_call(call)

            # Update user call states
            await call_signal_manager.set_user_state(
                caller_id, UserCallState.RINGING, call_id
            )
            await call_signal_manager.set_user_state(
                target_id, UserCallState.RINGING, call_id
            )

            # Notify callee
            await call_signal_manager.send_to_user(
                target_id,
                {
                    "type": "call.incoming",
                    "call_id": call_id,
                    "from_user_id": caller_id,
                    "media_type": msg.media_type,
                    "context_id": msg.context_id,
                },
            )

        # ACK for caller
        return {
            "type": "call.invite_ack",
            "call_id": call_id,
            "target_id": target_id,
            "media_type": msg.media_type,
            "status": "ringing",
        }

    async def answer(self, user_id: str, msg: CallAnswerMessage) -> dict:
        call = await self._get_call(msg.call_id)

        if call.callee_id != user_id:
            raise CallServiceError("not_callee", "Only callee can answer the call")

        if call.state != CallState.RINGING:
            raise CallServiceError("invalid_state", f"Cannot answer from state {call.state}")

        call.state = CallState.ACTIVE
        await self._save_call(call)

        await call_signal_manager.set_user_state(
            call.caller_id, UserCallState.IN_CALL, call.id
        )
        await call_signal_manager.set_user_state(
            call.callee_id, UserCallState.IN_CALL, call.id
        )

        # Notify both
        await call_signal_manager.send_to_users(
            [call.caller_id, call.callee_id],
            {
                "type": "call.accepted",
                "call_id": call.id,
                "media_type": call.media_type,
            },
        )

        return {
            "type": "call.answer_ack",
            "call_id": call.id,
            "status": "active",
        }

    async def reject(self, user_id: str, msg: CallRejectMessage) -> dict:
        call = await self._get_call(msg.call_id)

        if call.callee_id != user_id:
            raise CallServiceError("not_callee", "Only callee can reject the call")

        if call.state != CallState.RINGING:
            raise CallServiceError("invalid_state", f"Cannot reject from state {call.state}")

        call.state = CallState.REJECTED
        call.reason = msg.reason or "rejected"
        await self._save_call(call)

        # Reset states
        await call_signal_manager.clear_user_call(call.caller_id, call.id)
        await call_signal_manager.clear_user_call(call.callee_id, call.id)

        # Notify caller
        await call_signal_manager.send_to_user(
            call.caller_id,
            {
                "type": "call.rejected",
                "call_id": call.id,
                "reason": call.reason,
            },
        )

        return {
            "type": "call.reject_ack",
            "call_id": call.id,
            "status": "rejected",
        }

    async def cancel(self, user_id: str, msg: CallCancelMessage) -> dict:
        call = await self._get_call(msg.call_id)

        if call.caller_id != user_id:
            raise CallServiceError("not_caller", "Only caller can cancel the call")

        if call.state not in (CallState.RINGING,):
            raise CallServiceError("invalid_state", f"Cannot cancel from state {call.state}")

        call.state = CallState.CANCELED
        call.reason = "canceled_by_caller"
        await self._save_call(call)

        await call_signal_manager.clear_user_call(call.caller_id, call.id)
        await call_signal_manager.clear_user_call(call.callee_id, call.id)

        await call_signal_manager.send_to_user(
            call.callee_id,
            {
                "type": "call.canceled",
                "call_id": call.id,
                "reason": call.reason,
            },
        )

        return {
            "type": "call.cancel_ack",
            "call_id": call.id,
            "status": "canceled",
        }

    async def end(self, user_id: str, msg: CallEndMessage) -> dict:
        call = await self._get_call(msg.call_id)

        if call.state != CallState.ACTIVE:
            raise CallServiceError("invalid_state", f"Cannot end from state {call.state}")

        if user_id not in (call.caller_id, call.callee_id):
            raise CallServiceError("not_participant", "User not part of call")

        call.state = CallState.ENDED
        call.reason = msg.reason or "ended_by_participant"
        await self._save_call(call)

        await call_signal_manager.clear_user_call(call.caller_id, call.id)
        await call_signal_manager.clear_user_call(call.callee_id, call.id)

        other_id = call.callee_id if user_id == call.caller_id else call.caller_id

        await call_signal_manager.send_to_user(
            other_id,
            {
                "type": "call.ended",
                "call_id": call.id,
                "reason": call.reason,
                "by_user_id": user_id,
            },
        )

        # Optionally drop from memory
        await self._delete_call(call.id)

        return {
            "type": "call.end_ack",
            "call_id": call.id,
            "status": "ended",
        }

    # ────────── WebRTC forwarding ──────────

    async def _get_peer_id(self, call: Call, sender_id: str) -> str:
        if sender_id == call.caller_id:
            return call.callee_id
        if sender_id == call.callee_id:
            return call.caller_id
        raise CallServiceError("not_participant", "User not part of call")

    async def relay_offer(self, sender_id: str, msg: WebRTCOfferMessage) -> None:
        call = await self._get_call(msg.call_id)
        if call.state not in (CallState.RINGING, CallState.ACTIVE):
            raise CallServiceError("invalid_state", "Cannot send offer for this call state")

        peer_id = await self._get_peer_id(call, sender_id)

        await call_signal_manager.send_to_user(
            peer_id,
            {
                "type": "webrtc.offer",
                "call_id": call.id,
                "from_user_id": sender_id,
                "sdp": msg.sdp,
                "sdp_type": msg.sdp_type,
            },
        )

    async def relay_answer(self, sender_id: str, msg: WebRTCAnswerMessage) -> None:
        call = await self._get_call(msg.call_id)
        if call.state not in (CallState.RINGING, CallState.ACTIVE):
            raise CallServiceError("invalid_state", "Cannot send answer for this call state")

        peer_id = await self._get_peer_id(call, sender_id)

        await call_signal_manager.send_to_user(
            peer_id,
            {
                "type": "webrtc.answer",
                "call_id": call.id,
                "from_user_id": sender_id,
                "sdp": msg.sdp,
                "sdp_type": msg.sdp_type,
            },
        )

    async def relay_ice(self, sender_id: str, msg: IceCandidateMessage) -> None:
        call = await self._get_call(msg.call_id)
        if call.state not in (CallState.RINGING, CallState.ACTIVE):
            # Don't fail hard on ICE in weird states; just ignore.
            return

        peer_id = await self._get_peer_id(call, sender_id)

        await call_signal_manager.send_to_user(
            peer_id,
            {
                "type": "webrtc.ice_candidate",
                "call_id": call.id,
                "from_user_id": sender_id,
                "candidate": msg.candidate,
                "sdp_mid": msg.sdp_mid,
                "sdp_mline_index": msg.sdp_mline_index,
            },
        )

    # ────────── disconnect handling ──────────

    async def handle_disconnect(self, user_id: str) -> None:
        """
        If a user disconnects with an active call, end it and tell the peer.
        """
        call_id = await call_signal_manager.get_user_call_id(user_id)
        if not call_id:
            return

        try:
            call = await self._get_call(call_id)
        except CallServiceError:
            await call_signal_manager.clear_user_call(user_id, call_id)
            return

        if call.state not in (CallState.RINGING, CallState.ACTIVE):
            await call_signal_manager.clear_user_call(call.caller_id, call.id)
            await call_signal_manager.clear_user_call(call.callee_id, call.id)
            return

        call.state = CallState.FAILED
        call.reason = "peer_disconnected"
        await self._save_call(call)

        peer_id = call.callee_id if user_id == call.caller_id else call.caller_id

        await call_signal_manager.clear_user_call(call.caller_id, call.id)
        await call_signal_manager.clear_user_call(call.callee_id, call.id)

        await call_signal_manager.send_to_user(
            peer_id,
            {
                "type": "call.ended",
                "call_id": call.id,
                "reason": call.reason,
                "by_user_id": user_id,
            },
        )

        await self._delete_call(call.id)
    


    async def _get_rtc(self, call_id: str, user_id: str) -> RTCConnection:
        key = (call_id, user_id)
        async with self._lock:
            rtc = self._rtc.get(key)
            if not rtc:
                rtc = RTCConnection(call_id, user_id)
                await rtc.add_tracks()
                self._rtc[key] = rtc
            return rtc

    async def _close_rtc(self, call_id: str, user_id: str):
        key = (call_id, user_id)
        async with self._lock:
            rtc = self._rtc.pop(key, None)
        if rtc:
            await rtc.close()



call_service = CallService()