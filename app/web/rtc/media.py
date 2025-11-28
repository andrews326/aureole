# web/rtc/media.py

import asyncio
import fractions
from aiortc import MediaStreamTrack # type: ignore


class DummyAudioTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self):
        super().__init__()
        self.counter = 0

    async def recv(self):
        """
        Sends silent audio frames for keep-alive.
        """
        from aiortc.mediastreams import AudioFrame # type: ignore
        
        pts, time_base = self.counter, fractions.Fraction(1, 8000)
        self.counter += 160  # 20ms at 8kHz

        frame = AudioFrame(8000, 1)
        frame.pts = pts
        frame.time_base = time_base
        return frame


class DummyVideoTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self):
        super().__init__()
        self.counter = 0

    async def recv(self):
        """
        Sends blank video frames so the stream is always alive.
        """
        import numpy as np
        import fractions
        from aiortc import VideoFrame # type: ignore

        img = np.zeros((480, 640, 3), dtype=np.uint8)
        frame = VideoFrame.from_ndarray(img, format="bgr24")

        frame.pts = self.counter
        frame.time_base = fractions.Fraction(1, 30)
        self.counter += 1
        return frame