// src/components/NavBarBadge.tsx
import { Bell } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

export default function NavBarBadge() {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <Bell className="w-6 h-6 text-gray-200" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
