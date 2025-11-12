// src/services/chatService.ts


import { useEffect, useRef } from "react";

export type EventMessage =
  | { type: "message"; message_id: string; sender_id: string; content: string; timestamp: string }
  | { type: "delivery_receipt"; message_id: string } // NEW: handle delivery notifications
  | { type: "read_receipt"; message_ids: string[] }
  | { type: "ai_suggestions"; original_message_id: string; replies: string[]; remaining_today?: number }
  | { type: "error"; message: string };

export class PersistentChatService {
  private ws: WebSocket | null = null;
  private userId: string;
  private listeners: ((event: EventMessage) => void)[] = [];
  private reconnectInterval = 3000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManuallyClosed = false;
  private isReconnecting = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  connect() {
    // prevent duplicate sockets
    if (this.ws || this.isReconnecting) return;

    const wsUrl = `ws://127.0.0.1:8000/ws/chat/${this.userId}`;
    console.log("🔌 Connecting:", wsUrl);
    this.ws = new WebSocket(wsUrl);
    this.isManuallyClosed = false;

    // --- on open ---
    this.ws.onopen = () => {
      console.log("✅ WS connected");
      this.isReconnecting = false;

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    // --- on message ---
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((cb) => cb(data));
      } catch (err) {
        console.error("❌ Invalid WS payload:", event.data, err);
      }
    };

    // --- on close ---
    this.ws.onclose = (event) => {
      console.warn("🔌 WS closed:", event.code, event.reason);
      this.ws = null;

      // Auto-reconnect only if not manually closed
      if (!this.isManuallyClosed) {
        if (!this.isReconnecting) {
          this.isReconnecting = true;
          console.log(`🔄 Reconnecting in ${this.reconnectInterval / 1000}s...`);
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, this.reconnectInterval);
        }
      }
    };

    // --- on error ---
    this.ws.onerror = (err) => {
      console.error("❌ WS error:", err);
      // avoid crashing — socket will trigger onclose after
    };
  }

  disconnect() {
    console.log("👋 Manually closing WS");
    this.isManuallyClosed = true;
    this.isReconnecting = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(cb: (event: EventMessage) => void) {
    this.listeners.push(cb);
  }

  private safeSend(payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn("⚠️ Tried to send while WS not open:", payload);
    }
  }

  sendMessage(receiverId: string, content: string) {
    this.safeSend({ type: "message", receiver_id: receiverId, content });
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

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// React hook (unchanged)
export function usePersistentChat(userId: string) {
  const chatRef = useRef<PersistentChatService | null>(null);

  useEffect(() => {
    if (!userId) return;
    const chat = new PersistentChatService(userId);
    chat.connect();
    chatRef.current = chat;
    return () => chat.disconnect();
  }, [userId]);

  return chatRef.current;
}