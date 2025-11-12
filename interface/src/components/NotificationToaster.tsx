// src/components/NotificationToaster.tsx


import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

interface ToastData {
  id: string;
  type: string;
  actor_name?: string;
  meta?: Record<string, any>;
}

export default function NotificationToaster() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const listener = (e: CustomEvent<ToastData>) => {
      const notif = e.detail;
      setToasts((prev) => [notif, ...prev]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== notif.id));
      }, 5000);
    };
    window.addEventListener("app:toast", listener as any);
    return () => window.removeEventListener("app:toast", listener as any);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-3 z-[9999]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="glass-card px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 border border-white/10 backdrop-blur-md"
          >
            <Bell className="text-yellow-400" size={20} />
            <div>
              <p className="font-semibold text-sm">
                {toast.actor_name || "Someone"} {toast.meta?.note || "sent you something!"}
              </p>
              <p className="text-xs text-gray-300 mt-1">{toast.type.toUpperCase()}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}