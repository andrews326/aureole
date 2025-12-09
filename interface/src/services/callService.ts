

import api from "@/services/api";
import { store } from "@/redux/store";

export type MediaType = "audio" | "video";

export type CallEvent =
  | {
      type: "incoming_call";
      callId: string;
      fromUserId: string;
      mediaType: MediaType;
      contextId?: string | null;
    }
  | {
      type: "outgoing_call_started";
      callId: string;
      toUserId: string;
      mediaType: MediaType;
    }
  | {
      type: "call_ringing";
      callId: string;
      role: "caller" | "callee";
    }
  | {
      type: "call_active";
      callId: string;
      mediaType: MediaType;
    }
  | {
      type: "call_rejected";
      callId: string;
      reason?: string;
    }
  | {
      type: "call_canceled";
      callId: string;
      reason?: string;
    }
  | {
      type: "call_ended";
      callId: string;
      reason?: string;
      byUserId?: string;
    }
  | {
      type: "call_init";
      state: string;
      activeCallId: string | null;
    }
  | {
      type: "local_stream";
      callId: string;
      stream: MediaStream;
    }
  | {
      type: "remote_stream";
      callId: string;
      stream: MediaStream;
    }
  | {
      type: "heartbeat_ack";
      callId?: string | null;
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

type RtcConfigResponse = {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  iceTransportPolicy?: "all" | "relay";
};

type RawSignalMessage = {
  type: string;
  [key: string]: any;
};

export class PersistentCallService {
  private ws: WebSocket | null = null;
  private userId: string;
  private listeners: ((event: CallEvent) => void)[] = [];
  private reconnectInterval = 3000;
  private reconnectTimer: number | null = null;
  private isManuallyClosed = false;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private rtcConfig: RtcConfigResponse | null = null;

  private currentCallId: string | null = null;
  private currentMediaType: MediaType | null = null;
  private isCaller: boolean = false;
  private token: string;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;

  // cache incoming call meta to know mediaType on answer
  private incomingCalls: Map<
    string,
    { fromUserId: string; mediaType: MediaType; contextId?: string | null }
  > = new Map();

  constructor(userId: string, token: string) {
    this.userId = userId;
    this.token = token;
  }

  public getUserId(): string {
    return this.userId;
  }

  public setToken(newToken: string) {
    this.token = newToken;
  }

  // ─────────────────────────────
  // PUBLIC: listeners
  // ─────────────────────────────

  onEvent(cb: (event: CallEvent) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== cb);
    };
  }

  private emit(event: CallEvent) {
    this.listeners.forEach((cb) => cb(event));
  }

  private emitError(code: string, message: string) {
    this.emit({ type: "error", code, message });
  }

  // ─────────────────────────────
  // CONNECT / RECONNECT
  // ─────────────────────────────

  connect() {
    if (!this.userId) return;

    const state = store.getState();
    const token = state.auth?.token;
    console.log("CALL TOKEN:", token);

    if (!token) {
      console.warn("[CallService] Missing auth token; not connecting WS");
      this.emitError(
        "unauthorized",
        "No auth token available for call signaling"
      );
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      console.log("🔗 Call WS already active");
      return;
    }
    const productionIp = import.meta.env.PRODUCTION_IP;
    let hostIp = "localhost";

    // If PRODUCTION_IP is available, use it as the host IP
    if (productionIp) {
      hostIp = productionIp;
    }

    // Determine the WebSocket protocol based on the page protocol
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";

    // Use hostIp if the current hostname matches it, otherwise use window.location.host
    const host = window.location.hostname === hostIp
      ? `${hostIp}:8000`
      : window.location.host;

    console.log("WebSocket URL:", `${scheme}://${host}/ws/`);

    const url = `${scheme}://${host}/ws/call/${encodeURIComponent(
      this.userId
    )}`;
    console.log("🔌 Connecting CALL WS to", url, [token]);

    this.isManuallyClosed = false;

    let ws: WebSocket;
    try {
      // JWT in Sec-WebSocket-Protocol as per backend design
      ws = new WebSocket(url, [token]);
    } catch (err) {
      console.error("Failed to construct Call WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws = ws;

    ws.onopen = () => {
      console.log("✅ Call WS open");
      if (this.reconnectTimer) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    ws.onmessage = (ev) => {
      let parsed: RawSignalMessage;
      try {
        parsed = JSON.parse(ev.data);
      } catch (err) {
        console.error("❌ Call WS invalid JSON:", ev.data, err);
        this.emitError("invalid_json", "Invalid JSON from call WS");
        return;
      }

      console.log("📨 CALL WS IN:", parsed);
      this.handleSignal(parsed);
    };

    ws.onclose = (ev) => {
      console.warn("🔌 Call WS closed", ev.code, ev.reason);
      this.ws = null;

      // server treats this as call failure; clean local state
      this.cleanupPeerConnection();
      this.currentCallId = null;
      this.currentMediaType = null;
      this.isCaller = false;
      this.incomingCalls.clear();

      if (!this.isManuallyClosed) this.scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error("⚠️ Call WS error", err);
      // onclose will handle reconnect
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isManuallyClosed) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      console.log("🔄 Reconnecting Call WS...");
      this.connect();
    }, this.reconnectInterval);
  }

  disconnect() {
    this.isManuallyClosed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, "client_closing");
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.cleanupPeerConnection();
    this.currentCallId = null;
    this.currentMediaType = null;
    this.isCaller = false;
    this.incomingCalls.clear();
  }

  isConnected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // ─────────────────────────────
  // PUBLIC: call control API
  // ─────────────────────────────

  async startCall(
    targetId: string,
    mediaType: MediaType = "audio",
    contextId?: string
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emitError("ws_not_connected", "Call WebSocket not connected");
      return;
    }

    if (this.currentCallId) {
      this.emitError("already_in_call", "Already in a call");
      return;
    }

    this.isCaller = true;
    this.currentMediaType = mediaType;

    this.safeSend({
      type: "call.invite",
      target_id: targetId,
      media_type: mediaType,
      context_id: contextId,
    });
  }

  async acceptCall(callId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emitError("ws_not_connected", "Call WebSocket not connected");
      return;
    }

    const incoming = this.incomingCalls.get(callId);
    if (!incoming) {
      this.emitError("unknown_call", "No incoming call with this id");
      return;
    }

    this.currentCallId = callId;
    this.currentMediaType = incoming.mediaType;
    this.isCaller = false;

    // Ensure mic/cam is ready BEFORE answering
    await this.ensurePeerConnection(callId);

    this.safeSend({
      type: "call.answer",
      call_id: callId,
    });
    // WebRTC offer from peer will arrive as `webrtc.offer`
  }

  async rejectCall(callId: string, reason?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emitError("ws_not_connected", "Call WebSocket not connected");
      return;
    }

    this.safeSend({
      type: "call.reject",
      call_id: callId,
      reason,
    });

    // local optimistic cleanup for that incoming call
    this.incomingCalls.delete(callId);
    if (this.currentCallId === callId) {
      this.currentCallId = null;
      this.currentMediaType = null;
      this.cleanupPeerConnection();
    }
  }

  async cancelCall(callId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emitError("ws_not_connected", "Call WebSocket not connected");
      return;
    }

    this.safeSend({
      type: "call.cancel",
      call_id: callId,
    });
  }

  async endCall(reason?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emitError("ws_not_connected", "Call WebSocket not connected");
      return;
    }
    if (!this.currentCallId) {
      this.emitError("no_active_call", "No active call to end");
      return;
    }

    const callId = this.currentCallId;

    this.safeSend({
      type: "call.end",
      call_id: callId,
      reason,
    });

    this.cleanupPeerConnection();
    this.currentCallId = null;
    this.currentMediaType = null;
    this.isCaller = false;
  }

  sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.safeSend({
      type: "call.heartbeat",
      call_id: this.currentCallId,
    });
  }

  // ─────────────────────────────
  // Core WebRTC setup (Metered)
  // ─────────────────────────────

  private async ensureRtcConfig(): Promise<RtcConfigResponse> {
    if (this.rtcConfig) return this.rtcConfig;

    try {
      // Prefer project-specific dynamic credentials from Metered
      const resp = await fetch(
        "https://aureole.metered.live/api/v1/turn/credentials?apiKey=554e2eb35a4bb9f4cd4ac96344fe4b54b3a8"
      );
      const iceServers = await resp.json();

      this.rtcConfig = {
        iceServers,
        iceTransportPolicy: "all", // allow host + srflx + relay
      };

      console.log("🌐 Loaded TURN servers from Metered API:", this.rtcConfig);
      return this.rtcConfig;
    } catch (err) {
      console.error("❌ Failed loading TURN servers via API:", err);

      // Fallback to your static Metered credentials
      this.rtcConfig = {
        iceServers: [
          {
            urls: "stun:stun.relay.metered.ca:80",
          },
          {
            urls: "turn:global.relay.metered.ca:80",
            username: "e2696b93565b0a3267a5537f",
            credential: "bLnx60ekd+IPRnfu",
          },
          {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "e2696b93565b0a3267a5537f",
            credential: "bLnx60ekd+IPRnfu",
          },
          {
            urls: "turn:global.relay.metered.ca:443",
            username: "e2696b93565b0a3267a5537f",
            credential: "bLnx60ekd+IPRnfu",
          },
          {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "e2696b93565b0a3267a5537f",
            credential: "bLnx60ekd+IPRnfu",
          },
        ],
        iceTransportPolicy: "all",
      };

      console.log("🌐 Loaded fallback static Metered TURN config:", this.rtcConfig);
      return this.rtcConfig;
    }
  }

  private async ensurePeerConnection(
    callId: string
  ): Promise<RTCPeerConnection> {
    if (this.pc) return this.pc;
    const cfg = await this.ensureRtcConfig();

    this.pc = new RTCPeerConnection(cfg);

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws && this.currentCallId === callId) {
        this.safeSend({
          type: "webrtc.ice_candidate",
          call_id: callId,
          candidate: event.candidate.candidate,
          sdp_mid: event.candidate.sdpMid,
          sdp_mline_index: event.candidate.sdpMLineIndex,
        });
      }
    };

    this.pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;
      this.remoteStream = remoteStream;
      if (this.currentCallId) {
        this.emit({
          type: "remote_stream",
          callId: this.currentCallId,
          stream: remoteStream,
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log("[CallService] PC state:", this.pc?.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log(
        "[CallService] ICE state:",
        this.pc?.iceConnectionState
      );
    };

    // Attach local media
    await this.attachLocalMediaTracks(callId);

    return this.pc;
  }

  private async attachLocalMediaTracks(callId: string) {
    const mediaType = this.currentMediaType || "audio";

    if (!this.pc) return;

    if (!this.localStream) {
      // request devices: prefer video if mediaType === "video"
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mediaType === "video",
        });
      } catch (err) {
        console.warn(
          "[CallService] getUserMedia failed; trying audio-only",
          err
        );
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          this.currentMediaType = "audio";
        } catch (err2) {
          console.error(
            "[CallService] getUserMedia failed completely",
            err2
          );
          this.emitError(
            "media_error",
            "Unable to access microphone/camera. Check permissions."
          );
          return;
        }
      }

      this.emit({
        type: "local_stream",
        callId,
        stream: this.localStream,
      });
    }

    this.localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });
  }

  private cleanupPeerConnection() {
    if (this.pc) {
      try {
        this.pc.onicecandidate = null;
        this.pc.ontrack = null;
        this.pc.onconnectionstatechange = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    // do NOT stop remoteStream tracks (they belong to peer)
    this.remoteStream = null;

    // reset signaling helpers
    this.remoteDescriptionSet = false;
    this.pendingCandidates = [];
  }

  // ─────────────────────────────
  // Signaling → events + WebRTC
  // ─────────────────────────────

  private async handleSignal(msg: RawSignalMessage) {
    switch (msg.type) {
      case "call.init": {
        this.emit({
          type: "call_init",
          state: msg.state,
          activeCallId: msg.active_call_id ?? null,
        });
        return;
      }

      case "call.incoming": {
        const callId = msg.call_id as string;
        const fromUserId = msg.from_user_id as string;
        const mediaType = (msg.media_type as MediaType) || "audio";

        this.incomingCalls.set(callId, {
          fromUserId,
          mediaType,
          contextId: msg.context_id ?? null,
        });

        this.emit({
          type: "incoming_call",
          callId,
          fromUserId,
          mediaType,
          contextId: msg.context_id ?? null,
        });
        return;
      }

      case "call.invite_ack": {
        const callId = msg.call_id as string;
        const targetId = msg.target_id as string;
        const mediaType = (msg.media_type as MediaType) || "audio";

        this.currentCallId = callId;
        this.currentMediaType = mediaType;

        this.emit({
          type: "outgoing_call_started",
          callId,
          toUserId: targetId,
          mediaType,
        });

        this.emit({
          type: "call_ringing",
          callId,
          role: "caller",
        });
        return;
      }

      case "call.accepted": {
        const callId = msg.call_id as string;
        const mediaType = (msg.media_type as MediaType) || "audio";

        this.currentCallId = callId;
        this.currentMediaType = mediaType;

        this.emit({
          type: "call_active",
          callId,
          mediaType,
        });

        // Caller kicks off WebRTC negotiation
        if (this.isCaller) {
          const pc = await this.ensurePeerConnection(callId);

          if (pc.signalingState === "stable") {
            await this.createAndSendOffer(callId);
          } else {
            console.warn(
              "[CallService] Not creating offer: PC state =",
              pc.signalingState
            );
          }
        } else {
          // Callee waits for webrtc.offer
          this.emit({
            type: "call_ringing",
            callId,
            role: "callee",
          });
        }

        return;
      }

      case "call.answer_ack": {
        const callId = msg.call_id as string;

        // callee confirmation that call is now active
        this.currentCallId = callId;

        this.emit({
          type: "call_active",
          callId,
          mediaType: this.currentMediaType || "audio",
        });

        return;
      }

      case "call.reject_ack": {
        const callId = msg.call_id as string;
        this.emit({
          type: "call_rejected",
          callId,
          reason: msg.status || "rejected",
        });
        if (this.currentCallId === callId) {
          this.currentCallId = null;
          this.currentMediaType = null;
          this.cleanupPeerConnection();
        }
        return;
      }

      case "call.rejected": {
        const callId = msg.call_id as string;
        this.emit({
          type: "call_rejected",
          callId,
          reason: msg.reason,
        });
        if (this.currentCallId === callId) {
          this.currentCallId = null;
          this.currentMediaType = null;
          this.cleanupPeerConnection();
        }
        return;
      }

      case "call.cancel_ack": {
        const callId = msg.call_id as string;
        this.emit({
          type: "call_canceled",
          callId,
          reason: msg.status || "canceled",
        });
        if (this.currentCallId === callId) {
          this.currentCallId = null;
          this.currentMediaType = null;
          this.cleanupPeerConnection();
        }
        return;
      }

      case "call.canceled": {
        const callId = msg.call_id as string;
        this.emit({
          type: "call_canceled",
          callId,
          reason: msg.reason,
        });
        if (this.currentCallId === callId) {
          this.currentCallId = null;
          this.currentMediaType = null;
          this.cleanupPeerConnection();
        }
        return;
      }

      case "call.ended": {
        const callId = msg.call_id as string;
        this.emit({
          type: "call_ended",
          callId,
          reason: msg.reason,
          byUserId: msg.by_user_id,
        });
        if (this.currentCallId === callId) {
          this.currentCallId = null;
          this.currentMediaType = null;
          this.cleanupPeerConnection();
        }
        return;
      }

      case "call.end_ack": {
        const callId = msg.call_id as string;
        this.emit({
          type: "call_ended",
          callId,
          reason: msg.status || "ended",
        });
        if (this.currentCallId === callId) {
          this.currentCallId = null;
          this.currentMediaType = null;
          this.cleanupPeerConnection();
        }
        return;
      }

      case "call.heartbeat_ack": {
        this.emit({
          type: "heartbeat_ack",
          callId: msg.call_id ?? null,
        });
        return;
      }

      case "call.error": {
        this.emitError(
          msg.code || "call_error",
          msg.message || "Unknown call error"
        );
        return;
      }

      case "webrtc.offer": {
        await this.handleRemoteOffer(msg);
        return;
      }

      case "webrtc.answer": {
        await this.handleRemoteAnswer(msg);
        return;
      }

      case "webrtc.ice_candidate": {
        await this.handleRemoteIce(msg);
        return;
      }

      default: {
        console.warn("[CallService] Unknown message type", msg);
        return;
      }
    }
  }

  // ─────────────────────────────
  // WebRTC signaling handlers
  // ─────────────────────────────

  private async createAndSendOffer(callId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emitError("ws_not_connected", "Call WebSocket not connected");
      return;
    }

    const pc = await this.ensurePeerConnection(callId);

    const state = pc.signalingState;
    console.log("[CallService] createAndSendOffer in state:", state);

    // Only safe time to create an offer
    if (state !== "stable") {
      console.warn(
        "[CallService] Skipping createOffer; invalid signalingState:",
        state
      );
      return;
    }

    let offer: RTCSessionDescriptionInit;
    try {
      offer = await pc.createOffer();
    } catch (err) {
      console.error("[CallService] createOffer failed:", err);
      return;
    }

    try {
      await pc.setLocalDescription(offer);
    } catch (err) {
      console.error("[CallService] setLocalDescription(offer) failed:", err);
      return;
    }

    this.safeSend({
      type: "webrtc.offer",
      call_id: callId,
      sdp: offer.sdp,
      sdp_type: offer.type, // "offer"
    });
  }

  private async handleRemoteOffer(msg: any) {
    const callId = msg.call_id as string;
    this.currentCallId = callId;

    const pc = await this.ensurePeerConnection(callId);

    const state = pc.signalingState;
    console.log("[CallService] handleRemoteOffer in state:", state);

    // Not doing renegotiation, so only accept offers in STABLE
    if (state !== "stable") {
      console.warn(
        "[CallService] Ignoring remote offer; invalid signalingState:",
        state
      );
      return;
    }

    const desc = new RTCSessionDescription({
      type: msg.sdp_type,
      sdp: msg.sdp,
    });

    try {
      await pc.setRemoteDescription(desc);
    } catch (err) {
      console.error("[CallService] setRemoteDescription(offer) failed:", err);
      return;
    }

    this.remoteDescriptionSet = true;

    // Flush buffered ICE candidates
    for (const c of this.pendingCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn("Buffered ICE candidate failed:", err);
      }
    }
    this.pendingCandidates = [];

    // After setting remote offer, state must be have-remote-offer
    if (pc.signalingState !== "have-remote-offer") {
      console.warn(
        "[CallService] Not creating answer; unexpected state after offer:",
        pc.signalingState
      );
      return;
    }

    let answer: RTCSessionDescriptionInit;
    try {
      answer = await pc.createAnswer();
    } catch (err) {
      console.error("[CallService] createAnswer failed:", err);
      return;
    }

    try {
      await pc.setLocalDescription(answer);
    } catch (err) {
      console.error(
        "[CallService] setLocalDescription(answer) failed:",
        err
      );
      return;
    }

    this.safeSend({
      type: "webrtc.answer",
      call_id: callId,
      sdp: answer.sdp,
      sdp_type: answer.type,
    });
  }

  private async handleRemoteAnswer(msg: any) {
    // Only the CALLER should ever process an answer
    if (!this.isCaller) {
      console.warn("[CallService] Ignoring remote answer because we are callee");
      return;
    }

    if (!this.pc) {
      console.warn(
        "[CallService] Ignoring remote answer: no RTCPeerConnection"
      );
      return;
    }

    const state = this.pc.signalingState;
    console.log("[CallService] handleRemoteAnswer in state:", state);

    // If we're already stable/closed, this is a duplicate or late answer → ignore
    if (state === "stable" || state === "closed") {
      console.warn(
        "[CallService] Ignoring remote answer: PC already in",
        state
      );
      return;
    }

    // Accept answers only in typical answer states
    if (state !== "have-local-offer" && state !== "have-remote-pranswer") {
      console.warn(
        "[CallService] Ignoring remote answer in unexpected state:",
        state
      );
      return;
    }

    const desc = new RTCSessionDescription({
      type: msg.sdp_type,
      sdp: msg.sdp,
    });

    try {
      await this.pc.setRemoteDescription(desc);
    } catch (err: any) {
      const msgText = err?.message || String(err);
      console.warn("[CallService] Failed to set remote answer:", msgText);
    }
  }

  private async handleRemoteIce(msg: any) {
    if (!msg.candidate) return;

    const candidate: RTCIceCandidateInit = {
      candidate: msg.candidate,
      sdpMid: msg.sdp_mid,
      sdpMLineIndex: msg.sdp_mline_index,
    };

    // If remote SDP isn't set yet, buffer candidates
    if (!this.remoteDescriptionSet || !this.pc) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("addIceCandidate FAILED:", err);
    }
  }

  // ─────────────────────────────
  // WS send helper
  // ─────────────────────────────

  private safeSend(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn("Call WS send failed:", err, payload);
      }
    } else {
      console.warn("Call WS not open, cannot send:", payload);
    }
  }
}