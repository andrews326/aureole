// src/services/notificationService.ts
export interface NotificationEvent {
  event: "notification" | "heartbeat" | "error";
  data?: any;
  timestamp?: string;
  message?: string;
}

export class PersistentNotificationService {
  private static instance: PersistentNotificationService | null = null;
  private ws: WebSocket | null = null;
  private listeners: ((event: NotificationEvent) => void)[] = [];
  private reconnectInterval = 5000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private userId: string;

  private constructor(userId: string) {
    this.userId = userId;
  }

  /** Singleton accessor */
  static getInstance(userId: string) {
    if (!this.instance || this.instance.userId !== userId) {
      if (this.instance) this.instance.disconnect(); // close old user session
      this.instance = new PersistentNotificationService(userId);
    }
    return this.instance;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("🔗 WS already connected");
      return;
    }

    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const host =
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "localhost:8000"
        : window.location.host;
    const wsUrl = `${scheme}://${host}/ws/notifications/${this.userId}`;

    console.log("🔔 Connecting to WS:", wsUrl);
    this.manuallyClosed = false;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("❌ WS create failed:", err);
      return;
    }

    this.ws.onopen = () => {
      console.log("✅ Notification WS connected");
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.ws?.send(JSON.stringify({ event: "hello", ts: Date.now() }));
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        this.listeners.forEach((cb) => cb(data));
      } catch (err) {
        console.error("❌ Invalid WS message:", err);
      }
    };

    this.ws.onerror = (err) => {
      console.error("⚠️ WS error:", err);
      this.ws?.close();
    };

    this.ws.onclose = (e) => {
      console.warn("🔌 WS closed:", e.reason || "no reason");
      this.ws = null;
      if (!this.manuallyClosed) {
        console.log(`🔄 Reconnecting in ${this.reconnectInterval / 1000}s`);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };
  }

  disconnect() {
    console.log("🧹 Closing WS manually");
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  onNotification(cb: (event: NotificationEvent) => void) {
    this.listeners.push(cb);
  }
}