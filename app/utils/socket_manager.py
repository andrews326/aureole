# utils/socket_manager.py


import asyncio
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.setdefault(user_id, []).append(websocket)
        print(f"🔌 {user_id} connected ({len(self.active_connections[user_id])} sockets)")

    async def disconnect(self, user_id: str, websocket: WebSocket):
        async with self._lock:
            conns = self.active_connections.get(user_id, [])
            self.active_connections[user_id] = [ws for ws in conns if ws != websocket]
            if not self.active_connections[user_id]:
                self.active_connections.pop(user_id, None)
        print(f"❌ {user_id} disconnected ({len(self.active_connections.get(user_id, []))} remaining)")

    async def send_personal_message(self, user_id: str, message: dict) -> bool:
        """
        Send `message` to all active WebSocket connections for the given user.
        Returns True if at least one send succeeds.
        Cleans up stale sockets automatically.
        """
        websockets = self.active_connections.get(user_id, [])
        if not websockets:
            return False

        stale = []
        sent = False

        for ws in list(websockets):
            try:
                await ws.send_json(message)
                sent = True
            except Exception as e:
                print(f"⚠️ Removing stale socket for {user_id}: {e}")
                stale.append(ws)

        # Remove stale connections
        for ws in stale:
            try:
                websockets.remove(ws)
            except ValueError:
                pass

        # If no active sockets remain, remove user entirely
        if not websockets:
            self.active_connections.pop(user_id, None)
        else:
            self.active_connections[user_id] = websockets

        return sent

    async def broadcast(self, message: dict):
        """
        Send message to all connected users.
        Removes stale connections as needed.
        """
        items = list(self.active_connections.items())
        for user_id, websockets in items:
            for ws in list(websockets):
                try:
                    await ws.send_json(message)
                except Exception as e:
                    print(f"⚠️ Broadcast fail for {user_id}: {e}")
                    await self.disconnect(user_id, ws)

manager = ConnectionManager()