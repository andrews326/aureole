// src/hooks/use-notification.tsx


import { createContext, useContext, ReactNode, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/redux/store";
import { toast } from "sonner";
import { Heart, MessageCircle, Eye } from "lucide-react";
import { PersistentNotificationService } from "@/services/notificationService";
import { notificationReceived } from "@/redux/slices/notificationSlice";

const NotificationContext = createContext({});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const dispatch = useDispatch();

  const wsRef = useRef<PersistentNotificationService | null>(null);

  const showToast = (type: string, message: string) => {
    const Icon =
      type === "match" ? Heart :
      type === "message" ? MessageCircle :
      Eye;

    toast(message, {
      icon: <Icon className="w-5 h-5 text-primary" />,
      duration: 3000,
    });
  };

  useEffect(() => {
    if (!userId) {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      return;
    }

    // Full teardown before starting new WS
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    // Create a brand new instance
    const service = new PersistentNotificationService(userId);
    wsRef.current = service;

    service.connect();

    service.onNotification((event) => {
      console.log("🔥 RAW WS NOTIFICATION:", event);

      if (event.event !== "notification" || !event.data) return;

      dispatch(notificationReceived(event.data));
      showToast(event.data.type, event.data.message_preview || event.data.actor_name);
    });

    return () => {
      service.disconnect();
    };

  }, [userId]);  // 👈 reactively reconnects based on userID

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);