// src/services/notificationService.ts

import { store } from "@/redux/store";
export interface NotificationEvent {
  event: "notification" | "heartbeat" | "error";
  data?: any;
  timestamp?: string;
  message?: string;
}

export class PersistentNotificationService {
  private ws: WebSocket | null = null;
  private listeners: ((event: NotificationEvent) => void)[] = [];
  private reconnectInterval = 5000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    // const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    // const host =
    //   ["13.50.111.194", "13.50.111.194"].includes(window.location.hostname)
    //     ? "13.50.111.194:8000"
    //     : window.location.host;

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


    const wsUrl = `${scheme}://${host}/ws/notifications/${this.userId}`;
    console.log("🔔 Connecting to WS:", wsUrl);

    this.manuallyClosed = false;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
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

    this.ws.onerror = () => {
      this.ws?.close();
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.manuallyClosed) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  onNotification(cb: (event: NotificationEvent) => void) {
    this.listeners.push(cb);
  }
}