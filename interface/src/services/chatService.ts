// -----------------------------
// src/services/chatService.ts
// ----------
// -------------------

import { store } from "@/redux/store";
export type EventMessage =
  | {
      type: "message";
      // backend may send either id or message_id – allow both
      id?: string;
      message_id?: string;
      sender_id: string;
      receiver_id?: string;
      content: string;
      timestamp?: string;

      // media
      message_type?: string;
      media_id?: string;
      media_url?: string;
      thumb_url?: string;
    }
  | { type: "delivery_receipt"; message_id: string }
  | { type: "read_receipt"; message_ids: string[] }
  | {
      type: "ai_suggestions";
      original_message_id: string;
      replies: string[];
      remaining_today?: number;
    }
  | { type: "error"; message: string }
  | {
      type: "message_deleted";
      message_id: string;
      by_user_id: string;
    }
  | {
      type: "message_reaction";
      message_id: string;
      user_id: string;
      reaction: string;
    }
  | {
      type: "message_reaction_removed";
      message_id: string;
      user_id: string;
    }

  // 🔥 moderation event from backend
  | {
    type: "message_moderated";
    message_id: string;
    placeholder: string;
    sender_id: string;
    receiver_id: string;
    message_type?: string;
  }
  
  // 🔥 ADD THESE — EXACTLY LIKE THIS
  | { type: "typing"; from: string }
  | { type: "stop_typing"; from: string };


export class PersistentChatService {
  private ws: WebSocket | null = null;
  private userId: string;
  private listeners: ((event: EventMessage) => void)[] = [];
  private reconnectInterval = 3000;
  private reconnectTimer: number | null = null;
  private isManuallyClosed = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ------------------------------------
  // CONNECT / RECONNECT
  // ------------------------------------
  connect() {
    if (!this.userId) return;

    // avoid duplicate sockets
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log("🔗 Chat WS already active");
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


    const url = `${scheme}://${host}/ws/chat/${encodeURIComponent(this.userId)}`;
    console.log("🔌 Connecting CHAT WS to", url);

    this.isManuallyClosed = false;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error("Failed to construct Chat WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log("✅ Chat WS open");
      if (this.reconnectTimer) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (ev) => {
      let parsed: any;
      try {
        parsed = JSON.parse(ev.data);
      } catch (err) {
        console.error("❌ Chat WS invalid JSON:", ev.data, err);
        this.emitError("invalid_json");
        return;
      }

      console.log("📨 CHAT WS IN:", parsed);

      if (!parsed || typeof parsed.type !== "string") {
        this.emitError("missing_type");
        return;
      }

      // 🔑 SINGLE pass-through dispatch (no shape throwing, no double-calls)
      this.listeners.forEach((cb) => cb(parsed as EventMessage));
    };

    this.ws.onclose = (ev) => {
      console.warn("🔌 Chat WS closed", ev.code, ev.reason);
      this.ws = null;
      if (!this.isManuallyClosed) this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("⚠️ Chat WS error", err);
      // let onclose handle reconnect
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isManuallyClosed) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      console.log("🔄 Reconnecting Chat WS...");
      this.connect();
    }, this.reconnectInterval);
  }

  // ------------------------------------
  // DISCONNECT
  // ------------------------------------
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
  }

  // ------------------------------------
  // LISTENERS
  // ------------------------------------
  onMessage(cb: (event: EventMessage) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== cb);
    };
  }

  private emitError(message: string) {
    const evt: EventMessage = { type: "error", message };
    this.listeners.forEach((cb) => cb(evt));
  }

  // ------------------------------------
  // SEND HELPERS
  // ------------------------------------
  private safeSend(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn("Chat WS send failed:", err, payload);
      }
    } else {
      console.warn("Chat WS not open, cannot send:", payload);
    }
  }

  sendMessage(receiverId: string, content: string) {
    this.safeSend({ type: "message", receiver_id: receiverId, content });
  }

  // send media messages
  sendMessageMedia(payload: {
    receiver_id: string;
    message_type: string;
    media_id: string;
    content?: string;
  }) {
    this.safeSend({
      type: "message",
      receiver_id: payload.receiver_id,
      message_type: payload.message_type,
      media_id: payload.media_id,
      content: payload.content || "",
    });
  }

  sendSelectedAIReply(receiverId: string, content: string) {
    this.safeSend({ type: "ai_selected", receiver_id: receiverId, content });
  }

  requestAISuggestions(originalMessageId: string, tone: string = "flirty") {
    this.safeSend({ type: "ai_request", original_message_id: originalMessageId, tone });
  }

  sendReadReceipts(messageIds: string[]) {
    this.safeSend({ type: "read_receipt", message_ids: messageIds });
  }

  isConnected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  sendTyping(receiverId: string) {
    this.safeSend({ type: "typing", receiver_id: receiverId });
  }
  
  stopTyping(receiverId: string) {
    this.safeSend({ type: "stop_typing", receiver_id: receiverId });
  }
}