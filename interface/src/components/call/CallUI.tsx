// src/components/call/CallUI.tsx

// src/components/call/CallUI.tsx

import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { getCallService } from "@/services/callServiceInstance";
import { callReset } from "@/redux/slices/callSlice";
import {
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";


export default function CallUI() {
  const dispatch = useDispatch();

  // Call service: PASSIVE reference (no connect here)
  const callService = getCallService();

  // Streams come directly from callService
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const call = useSelector((state: RootState) => state.call);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Listen only to callService events, don't create connections
  useEffect(() => {
    if (!callService) return;

    return callService.onEvent((ev) => {
      if (ev.type === "local_stream") setLocalStream(ev.stream);
      if (ev.type === "remote_stream") setRemoteStream(ev.stream);
    });
  }, [callService]);

  // Attach streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && call.mediaType === "video") {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, call.mediaType]);

  // Auto reset on ended
  useEffect(() => {
    if (call.status === "ended") {
      const t = setTimeout(() => dispatch(callReset()), 2500);
      return () => clearTimeout(t);
    }
  }, [call.status, dispatch]);

  if (call.status === "idle") return null;

  const handleAccept = () => {
    if (!callService || !call.callId) return;
    callService.acceptCall(call.callId);
  };

  const handleReject = () => {
    if (!callService || !call.callId) return;
    if (call.status === "incoming") {
      callService.rejectCall(call.callId, "rejected");
    } else if (call.status === "outgoing") {
      callService.cancelCall(call.callId);
    }
  };

  const handleEnd = () => {
    if (!callService) return;
    callService.endCall("ended_by_user");
  };

  const toggleMic = () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !micOn;
    setMicOn(track.enabled);
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !camOn;
    setCamOn(track.enabled);
  };

  const isVideo = call.mediaType === "video";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-5xl max-h-[90vh] mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        {/* Remote media area */}
        <div className="relative w-full h-full flex flex-col">
          {/* TOP CONTENT */}
          <div className="flex-1 relative">
            {/* Remote media */}
            {call.status === "active" && remoteStream ? (
              isVideo ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover bg-black"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-4xl font-semibold mb-4">
                    {call.peerUserId?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <p className="text-lg font-medium mb-1">
                    On {call.mediaType ?? "audio"} call
                  </p>
                  <p className="text-sm text-white/60">
                    Remote audio connected
                  </p>
                </div>
              )
            ) : (
              // Ringing / incoming UI visual
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 animate-pulse">
                  {call.status === "incoming" ? (
                    <PhoneIncoming className="w-14 h-14" />
                  ) : call.status === "outgoing" ? (
                    <PhoneOutgoing className="w-14 h-14" />
                  ) : (
                    <PhoneOff className="w-14 h-14" />
                  )}
                </div>
                <p className="text-xl font-semibold mb-2">
                  {call.status === "incoming"
                    ? "Incoming call"
                    : call.status === "outgoing"
                    ? "Calling..."
                    : "Call ended"}
                </p>
                <p className="text-sm text-white/60">
                  {call.mediaType?.toUpperCase() || "AUDIO"} •{" "}
                  {call.peerUserId || "Unknown user"}
                </p>
                {call.status === "ended" && call.error && (
                  <p className="text-xs text-red-400 mt-2">{call.error}</p>
                )}
              </div>
            )}

            {/* Local PiP video (for video calls) */}
            {isVideo && localStream && (
              <div className="absolute bottom-4 right-4 w-32 h-48 bg-black/60 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Hidden remote audio for audio-only or fallback */}
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          </div>

          {/* CONTROLS */}
          <div className="h-24 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-6 flex items-center justify-between">
            {/* Left: status text */}
            <div className="flex flex-col text-white/80">
              <span className="text-sm font-medium">
                {call.status === "incoming"
                  ? "Incoming call"
                  : call.status === "outgoing"
                  ? "Ringing..."
                  : call.status === "active"
                  ? "In call"
                  : "Call"}
              </span>
              <span className="text-xs text-white/50">
                {call.mediaType?.toUpperCase() || "AUDIO"} •{" "}
                {call.peerUserId || ""}
              </span>
            </div>

            {/* Center: controls */}
            <div className="flex items-center gap-4">
              {/* For incoming call: Accept / Reject */}
              {call.status === "incoming" && (
                <>
                  <button
                    onClick={handleReject}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleAccept}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition"
                  >
                    <PhoneIncoming className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* For outgoing call: Cancel */}
              {call.status === "outgoing" && (
                <button
                  onClick={handleReject}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              )}

              {/* Active call controls */}
              {call.status === "active" && (
                <>
                  {/* Mute toggle */}
                  <button
                    onClick={toggleMic}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border border-white/20 text-white shadow transition ${
                      micOn ? "bg-white/10" : "bg-red-600"
                    }`}
                  >
                    {micOn ? (
                      <Mic className="w-5 h-5" />
                    ) : (
                      <MicOff className="w-5 h-5" />
                    )}
                  </button>

                  {/* Camera toggle (video only) */}
                  {isVideo && (
                    <button
                      onClick={toggleCamera}
                      className={`flex items-center justify-center w-10 h-10 rounded-full border border-white/20 text-white shadow transition ${
                        camOn ? "bg-white/10" : "bg-yellow-600"
                      }`}
                    >
                      {camOn ? (
                        <Video className="w-5 h-5" />
                      ) : (
                        <VideoOff className="w-5 h-5" />
                      )}
                    </button>
                  )}

                  {/* End call */}
                  <button
                    onClick={handleEnd}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Right: error text / debug */}
            <div className="text-right text-xs text-red-400 max-w-[160px] line-clamp-2">
              {call.error}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}