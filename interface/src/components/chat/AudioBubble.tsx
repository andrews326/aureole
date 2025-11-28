// src/components/chat/AudioBubble.tsx


import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function AudioBubble({ url }: { url: string }) {
  const finalUrl = url.startsWith("http") ? url : BASE + url;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const update = () => {
      if (!audio.duration) return;
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(audio.currentTime);
    };

    const loaded = () => setDuration(audio.duration);
    const playHandler = () => setIsPlaying(true);
    const pauseHandler = () => setIsPlaying(false);
    const endedHandler = () => {
      setIsPlaying(false);
      setProgress(100);
    };

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", loaded);
    audio.addEventListener("play", playHandler);
    audio.addEventListener("pause", pauseHandler);
    audio.addEventListener("ended", endedHandler);

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("play", playHandler);
      audio.removeEventListener("pause", pauseHandler);
      audio.removeEventListener("ended", endedHandler);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const formatTime = (time: number | null, total?: number | null) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    if (total) {
      const remaining = Math.max(total - time, 0);
      const remM = Math.floor(remaining / 60);
      const remS = Math.floor(remaining % 60)
        .toString()
        .padStart(2, "0");
      return `-${remM}:${remS}`;
    }
    return `${minutes}:${seconds}`;
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl 
                 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-purple-500/10
                 border border-white/10 shadow-[0_0_18px_rgba(80,150,255,0.15)]
                 backdrop-blur-md max-w-[80%]"
    >
      <audio ref={audioRef} src={finalUrl} preload="metadata" className="hidden" />

      {/* Clean play/pause icon */}
      <button
        onClick={togglePlay}
        className="flex items-center justify-center text-white hover:text-blue-400 transition-all duration-200"
      >
        {isPlaying ? <Pause size={22} strokeWidth={2} /> : <Play size={22} strokeWidth={2} />}
      </button>

      {/* Bar + Time */}
      <div className="flex flex-col justify-center w-52">
        <div className="relative h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r 
                       from-blue-400 via-indigo-400 to-purple-500
                       shadow-[0_0_8px_rgba(80,150,255,0.6)]
                       transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex justify-between mt-1 text-[11px] text-white/60 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(currentTime, duration)}</span>
        </div>
      </div>
    </div>
  );
}