# web/rtc/recorder.py

import asyncio
import logging
from aiortc.contrib.media import MediaRecorder # type: ignore

logger = logging.getLogger(__name__)


class AudioRecorder:
    """
    Thin wrapper around aiortc MediaRecorder with lifecycle safety.
    """
    def __init__(self, output_path: str):
        self.output_path = output_path
        self.recorder = MediaRecorder(output_path)
        self.started = False
        self._lock = asyncio.Lock()

    async def start(self):
        async with self._lock:
            if self.started:
                return
            await self.recorder.start()
            self.started = True

    async def stop(self):
        async with self._lock:
            if not self.started:
                return
            await self.recorder.stop()
            self.started = False