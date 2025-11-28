# web/rtc/pc_manager.py

import asyncio
import logging
from typing import Dict, Optional

from aiortc import RTCPeerConnection, RTCIceCandidate, RTCSessionDescription # type: ignore
from aiortc.contrib.media import MediaRelay # type: ignore

from web.rtc.recorder import AudioRecorder
from web.rtc.media import DummyAudioTrack, DummyVideoTrack

logger = logging.getLogger(__name__)


class RTCConnection:
    """
    Represents a single user's WebRTC state for a call.
    """
    def __init__(self, call_id: str, user_id: str):
        self.call_id = call_id
        self.user_id = user_id

        self.pc = RTCPeerConnection()
        self.audio_recorder: Optional[AudioRecorder] = None

        # Higher quality shared media track relay for outgoing streams
        self.relay = MediaRelay()

        self.closed = False
        self._lock = asyncio.Lock()

    async def add_tracks(self):
        """
        Attach dummy audio/video tracks so the caller/callee can establish
        a complete WebRTC connection even if the app itself isn't producing media.
        """
        self.pc.addTrack(DummyAudioTrack())
        self.pc.addTrack(DummyVideoTrack())

    async def start_recording(self, output_path: str):
        """
        Starts audio recording using aiortc.
        """
        async with self._lock:
            if self.audio_recorder:
                return

            recorder = AudioRecorder(output_path)
            self.audio_recorder = recorder
            await recorder.start()

    async def stop_recording(self):
        async with self._lock:
            if not self.audio_recorder:
                return
            await self.audio_recorder.stop()
            self.audio_recorder = None

    async def close(self):
        async with self._lock:
            if self.closed:
                return
            self.closed = True
            
            try:
                if self.audio_recorder:
                    await self.audio_recorder.stop()
            except Exception as e:
                logger.error(f"Recorder stop error: {e}")

            try:
                await self.pc.close()
            except Exception as e:
                logger.error(f"PeerConnection close error: {e}")