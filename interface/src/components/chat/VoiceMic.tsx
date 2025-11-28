// src/components/chat/VoiceMic.tsx


import { useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";

export default function VoiceMic({
  startRecording,
  stopRecording,
}: {
  startRecording: (cb: (v: number) => void) => void;
  stopRecording: (cancelled: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [wave, setWave] = useState(0);
  const startX = useRef(0);

  const handleStart = (e: any) => {
    e.preventDefault();
    setCancelled(false);
    setRecording(true);
    startX.current = e.touches?.[0]?.clientX ?? e.clientX;
    startRecording((v) => setWave(v));
  };

  const handleMove = (e: any) => {
    if (!recording) return;
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    setCancelled(startX.current - x > 80);
  };

  const handleEnd = async () => {
    if (!recording) return;
    const wasCancelled = cancelled;
    setRecording(false);
    setCancelled(false);
    await stopRecording(wasCancelled);
  };

  return (
    <div
      className="relative flex items-center select-none"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
    >
      <button
        type="button"
        className={`relative p-3 rounded-full flex items-center justify-center 
          transition-all duration-300
          ${
            recording
              ? cancelled
                ? "text-red-400 hover:text-red-300"
                : "text-blue-400 hover:text-blue-300"
              : "text-white/80 hover:text-white"
          }`}
      >
        {/* Reactive glow pulse */}
        {recording && !cancelled && (
          <span
            className="absolute inset-0 rounded-full bg-blue-500/40 blur-md transition-all duration-100 ease-linear"
            style={{
              transform: `scale(${1 + wave * 1.5})`,
              opacity: Math.min(0.2 + wave * 0.8, 0.9),
            }}
          />
        )}

        {/* Icon */}
        <span className="relative z-10">
          {recording ? (cancelled ? <X size={22} /> : <Square size={22} />) : <Mic size={22} />}
        </span>
      </button>

      {recording && (
        <div
          className={`ml-2 text-sm transition-all duration-200 ${
            cancelled ? "text-red-400" : "text-white/70"
          }`}
        >
          {cancelled ? "Release to cancel" : "Slide left to cancel"}
        </div>
      )}

      {recording && (
        <div
          className={`absolute bottom-[-8px] left-0 h-[3px] rounded-full transition-all duration-150
            ${cancelled ? "bg-red-500/40" : "bg-blue-500/40"}`}
          style={{
            width: `${Math.min(wave * 100, 100)}%`,
          }}
        />
      )}
    </div>
  );
}