// // src/context/NotificationContext.tsx


// import React, { createContext, useContext, useState, useEffect } from "react";
// import { NotificationPayload, usePersistentNotifications } from "@/services/notificationService";

// interface NotificationContextValue {
//   notifications: NotificationPayload[];
//   unreadCount: number;
//   markAllRead: () => void;
// }

// const NotificationContext = createContext<NotificationContextValue | null>(null);

// export const NotificationProvider = ({ userId, children }: { userId: string; children: React.ReactNode }) => {
//   const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
//   const notifService = usePersistentNotifications(userId);

//   useEffect(() => {
//     if (!notifService) return;

//     notifService.onNotification((event) => {
//       if (event.event === "notification") {
//         const notif = event.data;
//         setNotifications((prev) => [notif, ...prev]);
//         const toastEvent = new CustomEvent("app:toast", { detail: notif });
//         window.dispatchEvent(toastEvent);
//       }
//     });
//   }, [notifService]);

//   const markAllRead = () => setNotifications([]);

//   return (
//     <NotificationContext.Provider
//       value={{
//         notifications,
//         unreadCount: notifications.length,
//         markAllRead,
//       }}
//     >
//       {children}
//     </NotificationContext.Provider>
//   );
// };

// export const useNotifications = () => useContext(NotificationContext)!;