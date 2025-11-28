# web/signal/manager.py

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Set, Optional, Any, List

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from utils.ws_safe import safe_payload

logger = logging.getLogger(__name__)


class UserCallState(str, Enum):
    IDLE = "idle"
    RINGING = "ringing"
    IN_CALL = "in_call"


@dataclass
class UserSession:
    user_id: str
    state: UserCallState = UserCallState.IDLE
    current_call_id: Optional[str] = None


class CallSignalManager:
    """
    Dedicated manager for call signaling WebSockets.
    """

    def __init__(self) -> None:
        # user_id -> set[WebSocket]
        self._connections: Dict[str, Set[WebSocket]] = {}

        # user_id -> UserSession
        self._sessions: Dict[str, UserSession] = {}

        # user_id -> asyncio.Lock
        self._locks: Dict[str, asyncio.Lock] = {}

        # Global lock for dict mutations
        self._lock = asyncio.Lock()

    # ───────────── Connection management ─────────────

    async def register_connection(self, user_id: str, websocket: WebSocket) -> None:
        """
        Register an already-accepted WebSocket for the given user.
        Does NOT call websocket.accept() – router is responsible for auth + accept.
        """
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(websocket)

            if user_id not in self._sessions:
                self._sessions[user_id] = UserSession(user_id=user_id)

        logger.info(
            "🔌 Call WS connected: %s (%d active sockets)",
            user_id,
            len(self._connections[user_id]),
        )

    async def unregister_connection(self, user_id: str, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection for the user.
        Does NOT alter call state automatically – router/call_service
        should decide what to do on disconnect.
        """
        async with self._lock:
            conns = self._connections.get(user_id)
            if conns and websocket in conns:
                conns.remove(websocket)
                if not conns:
                    self._connections.pop(user_id, None)

        logger.info(
            "❌ Call WS disconnected: %s (%d remaining sockets)",
            user_id,
            len(self._connections.get(user_id, [])),
        )

    async def get_connections(self, user_id: str) -> Set[WebSocket]:
        async with self._lock:
            return set(self._connections.get(user_id, set()))

    async def is_online(self, user_id: str) -> bool:
        async with self._lock:
            return bool(self._connections.get(user_id))

    # ───────────── User call session state ─────────────

    async def get_user_session(self, user_id: str) -> UserSession:
        async with self._lock:
            session = self._sessions.get(user_id)
            if session is None:
                session = UserSession(user_id=user_id)
                self._sessions[user_id] = session
            return session

    async def set_user_state(
        self,
        user_id: str,
        state: UserCallState,
        call_id: Optional[str] = None,
    ) -> None:
        """
        Set the user's call state and optionally bind/unbind to a call_id.
        """
        async with self._lock:
            session = self._sessions.get(user_id)
            if session is None:
                session = UserSession(user_id=user_id)
                self._sessions[user_id] = session

            session.state = state
            session.current_call_id = call_id

        logger.debug(
            "📞 User state updated: %s → %s (call_id=%s)",
            user_id,
            state.value,
            call_id,
        )

    async def get_user_state(self, user_id: str) -> UserCallState:
        session = await self.get_user_session(user_id)
        return session.state

    async def get_user_call_id(self, user_id: str) -> Optional[str]:
        session = await self.get_user_session(user_id)
        return session.current_call_id

    async def clear_user_call(self, user_id: str, call_id: Optional[str] = None) -> None:
        """
        Reset user to IDLE state. If call_id is provided, only clear if it matches.
        """
        async with self._lock:
            session = self._sessions.get(user_id)
            if not session:
                return

            if call_id is not None and session.current_call_id != call_id:
                logger.debug(
                    "⚠️ clear_user_call skipped for %s: session call_id=%s != %s",
                    user_id,
                    session.current_call_id,
                    call_id,
                )
                return

            session.state = UserCallState.IDLE
            session.current_call_id = None

        logger.info("✅ User %s cleared to IDLE (call_id=%s)", user_id, call_id)

    async def is_user_busy(self, user_id: str) -> bool:
        """
        Busy means currently in ringing or in active call.
        """
        state = await self.get_user_state(user_id)
        return state in {UserCallState.RINGING, UserCallState.IN_CALL}

    # ───────────── Per-user locks ─────────────

    async def _get_lock_for_user(self, user_id: str) -> asyncio.Lock:
        async with self._lock:
            lock = self._locks.get(user_id)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[user_id] = lock
            return lock

    def user_lock(self, user_id: str):
        """
        Async context manager for per-user critical sections.

        Usage:
            async with call_signal_manager.user_lock(user_id):
                ...
        """
        return _AsyncLockContextWrapper(self, user_id)

    # ───────────── Messaging ─────────────

    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> bool:
        """
        Send `message` to all active WS connections for user.
        Returns True if at least one send succeeds.
        Cleans up stale sockets automatically.
        """
        async with self._lock:
            websockets = list(self._connections.get(user_id, set()))

        if not websockets:
            return False

        stale: List[WebSocket] = []
        sent_any = False

        payload = safe_payload(message)

        for ws in websockets:
            if ws.client_state != WebSocketState.CONNECTED:
                stale.append(ws)
                continue

            try:
                await ws.send_json(payload)
                sent_any = True
            except Exception as e:
                logger.warning("⚠️ Call WS send failed for %s: %s", user_id, e)
                stale.append(ws)

        if stale:
            async with self._lock:
                conns = self._connections.get(user_id, set())
                for ws in stale:
                    if ws in conns:
                        conns.remove(ws)
                if not conns:
                    self._connections.pop(user_id, None)

        return sent_any

    async def send_to_users(self, user_ids: List[str], message: Dict[str, Any]) -> None:
        """
        Fire-and-forget helper to send the same payload to multiple users.
        """
        if not user_ids:
            return

        await asyncio.gather(
            *(self.send_to_user(uid, message) for uid in set(user_ids))
        )

    async def send_error(
        self,
        websocket: WebSocket,
        code: str,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Send a standardized error payload to a single WebSocket.
        Used by the router when rejecting messages.
        """
        if websocket.client_state != WebSocketState.CONNECTED:
            return

        payload: Dict[str, Any] = {
            "type": "call.error",
            "code": code,
            "message": message,
        }
        if extra:
            payload.update(extra)

        try:
            await websocket.send_json(safe_payload(payload))
        except Exception as e:
            logger.warning("⚠️ Failed to send error to WS: %s", e)


class _AsyncLockContextWrapper:
    """
    Provides:
        async with call_signal_manager.user_lock(user_id):
            ...
    """

    def __init__(self, manager: CallSignalManager, user_id: str) -> None:
        self._manager = manager
        self._user_id = user_id
        self._lock: Optional[asyncio.Lock] = None

    async def __aenter__(self):
        self._lock = await self._manager._get_lock_for_user(self._user_id)
        await self._lock.acquire()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._lock and self._lock.locked():
            self._lock.release()

call_signal_manager = CallSignalManager()
