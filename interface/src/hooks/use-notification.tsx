// src/hooks/use-notification.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { toast } from "sonner";
import { Heart, MessageCircle, Eye } from "lucide-react";
import { PersistentNotificationService } from "@/services/notificationService";

export type NotificationType = "match" | "message" | "view";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCounts: {
    matches: number;
    messages: number;
    views: number;
  };
  clearAll: () => void;
  markAsRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialized, setInitialized] = useState(false);

  const addNotification = (type: NotificationType, message: string) => {
    const icon = type === "match" ? Heart : type === "message" ? MessageCircle : Eye;
    const IconComponent = icon;

    setNotifications((prev) => [
      {
        id: Date.now().toString(),
        type,
        message,
        timestamp: new Date(),
        read: false,
      },
      ...prev,
    ]);

    toast(message, {
      icon: <IconComponent className="w-5 h-5 text-primary animate-pulse" />,
      duration: 4000,
    });
  };

  useEffect(() => {
    if (!userId || initialized) return;
    setInitialized(true);

    console.log("🔔 Initializing NotificationProvider for user:", userId);
    const notifService = PersistentNotificationService.getInstance(userId);
    notifService.connect();

    notifService.onNotification((event) => {
      if (event.event === "notification" && event.data) {
        const type =
          event.data.type === "match"
            ? "match"
            : event.data.type === "view"
            ? "view"
            : "message";

        const message =
          event.data.meta?.note ||
          `${event.data.actor_name || "Someone"} sent you a ${type}`;

        addNotification(type, message);
      }
    });

    // we do NOT disconnect here unless user logs out
  }, [userId, initialized]);

  const markAsRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const clearAll = () => setNotifications([]);

  const unreadCounts = {
    matches: notifications.filter((n) => n.type === "match" && !n.read).length,
    messages: notifications.filter((n) => n.type === "message" && !n.read).length,
    views: notifications.filter((n) => n.type === "view" && !n.read).length,
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCounts, markAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};