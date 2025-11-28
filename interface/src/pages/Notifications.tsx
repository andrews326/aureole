// src/pages/Notifications.tsx

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  markRead,
  markAllRead,
  deleteNotification,
  clearNotifications,
} from "@/redux/slices/notificationSlice";
import swipeService from "@/services/swipeService";
import {
  Heart,
  MessageCircle,
  Eye,
  Star,
  Bell,
  Trash2,
  Inbox,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ICON MAP */
const iconMap: Record<string, any> = {
  match: Heart,
  message: MessageCircle,
  visit: Eye,
  like: Star,
  system: Bell,
};

/* FILTERS */
const categories = [
  { key: "all", label: "All" },
  { key: "message", label: "Messages" },
  { key: "match", label: "Matches" },
  { key: "visit", label: "Visits" },
  { key: "like", label: "Likes" },
  { key: "system", label: "System" },
];

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { list } = useSelector((s: RootState) => s.notifications);

  const [activeTab, setActiveTab] = useState("all");
  const filtered =
    activeTab === "all" ? list : list.filter((n) => n.type === activeTab);

  return (
    <div className="min-h-screen relative p-6 pb-28">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text 
          bg-gradient-to-r from-cyan-300 to-purple-500">
          Notifications
        </h1>

        {list.length > 0 && (
          <div className="flex items-center gap-2">

            <button
              onClick={() => dispatch(markAllRead())}
              className="px-3 py-1.5 rounded-full text-sm
                bg-cyan-500/15 text-cyan-300 border border-cyan-400/40
                hover:bg-cyan-500/25 transition"
            >
              Mark all read
            </button>

            <button
              onClick={() => {
                const unread = list.filter((n) => !n.read);
                dispatch(clearNotifications());
                unread.forEach((n) => dispatch(markRead(n.id)));
              }}
              className="px-3 py-1.5 rounded-full text-sm
                bg-purple-500/15 text-purple-300 border border-purple-400/40
                hover:bg-purple-500/25 transition"
            >
              Keep Unread
            </button>

          </div>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-6">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveTab(c.key)}
            className={`
              px-4 py-2 rounded-full text-sm transition-all whitespace-nowrap
              border backdrop-blur-xl
              ${
                activeTab === c.key
                  ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_14px_rgba(0,255,255,0.4)]"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
              }
            `}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* EMPTY */}
      {filtered.length === 0 && (
        <div className="h-[50vh] flex flex-col items-center justify-center opacity-70">
          <Inbox className="w-16 h-16 text-cyan-400 mb-4" />
          <p className="text-lg font-semibold">No notifications</p>
          <p className="text-sm text-white/40">Your cosmic inbox is silent ✨</p>
        </div>
      )}

      {/* LIST */}
      <div className="space-y-4">
        {filtered.map((n) => {
          const Icon = iconMap[n.type] || Bell;

          return (
            <NotificationCard
              key={n.id}
              notif={n}
              Icon={Icon}
              onRead={() => dispatch(markRead(n.id))}
              onDelete={() => dispatch(deleteNotification(n.id))}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CARD */
/* ------------------------------------------------------------------ */

interface NotificationCardProps {
  notif: any;
  Icon: any;
  onRead: () => void;
  onDelete: () => void;
}

const NotificationCard = ({
  notif,
  Icon,
  onRead,
  onDelete,
}: NotificationCardProps) => {
  const navigate = useNavigate();

  // FIXED — Correct match-request detection
  const isMatchRequest = notif.requestType === "match_request";

  const handleClick = () => {
    onRead();

    if (notif.type === "message" && notif.actor_id) {
      navigate(`/chat/${notif.actor_id}`);
      return;
    }

    if (notif.type === "match") {
      navigate(`/matches`);
      return;
    }

    if (isMatchRequest) return;
  };

  const acceptMatch = async (e: any) => {
    e.stopPropagation();
    onRead();
  
    const swiperId = notif.actor_id;
    if (!swiperId) {
      console.error("Missing actor_id in notification");
      return;
    }
  
    try {
      // Call backend to accept request
      await swipeService.acceptSwipe(swiperId);
  
      // Remove the notification from UI
      onDelete();
  
      // Redirect to matches page
      navigate("/matches");
    } catch (err) {
      console.error("Accept failed:", err);
    }
  };
  
  const rejectMatch = async (e: any) => {
    e.stopPropagation();
    onRead();
  
    const swiperId = notif.actor_id;
    if (!swiperId) {
      console.error("Missing actor_id in notification");
      return;
    }
  
    try {
      // Call backend to reject request
      await swipeService.rejectSwipe(swiperId);
  
      // Remove the notification from UI
      onDelete();
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };
  

  return (
    <div
      onClick={handleClick}
      className={`
        group relative p-4 rounded-2xl cursor-pointer
        backdrop-blur-xl border flex flex-col gap-4 transition-all
        ${
          notif.read
            ? "bg-white/5 border-white/10"
            : "bg-gradient-to-br from-cyan-600/15 to-purple-600/20 border-cyan-400/40 shadow-[0_0_18px_rgba(0,255,255,0.25)]"
        }
      `}
    >
      <div className="flex items-start gap-4">

        {/* ICON */}
        <div className="
          p-3 rounded-xl bg-white/10 border border-white/20 
          shadow-inner shadow-black/20
        ">
          <Icon className="w-5 h-5 text-cyan-300" />
        </div>

        {/* CONTENT */}
        <div className="flex-1">
          <p className="font-semibold text-white">
            {notif.actor_name ? `${notif.actor_name} – ` : ""}
            {notif.title}
          </p>

          <p className="text-white/60 text-sm leading-snug">
            {notif.message}
          </p>

          <p className="text-xs text-white/30 mt-2">
            {new Date(notif.timestamp).toLocaleString()}
          </p>
        </div>

        {/* DELETE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            opacity-60 hover:opacity-100 transition
            p-2 rounded-xl bg-white/5 hover:bg-white/10 
            border border-white/10
          "
        >
          <Trash2 className="w-4 h-4 text-red-300" />
        </button>

        {/* UNREAD DOT */}
        {!notif.read && (
          <div
            className="
              absolute -right-1 -top-1 w-3.5 h-3.5 rounded-full 
              bg-cyan-300 shadow-[0_0_12px_4px_rgba(0,255,255,0.6)]
              animate-pulse
            "
          />
        )}
      </div>

      {/* MATCH REQUEST ACTIONS */}
      {isMatchRequest && (
        <div className="flex justify-end gap-3 mt-1">
          <button
            onClick={(e) => acceptMatch(e)}

            className="
              px-4 py-2 text-sm rounded-lg 
              bg-emerald-600/30 text-emerald-200 
              border border-emerald-400/40
            "
          >
            Accept
          </button>

          <button
            onClick={(e) => rejectMatch(e)}

            className="
              px-4 py-2 text-sm rounded-lg 
              bg-red-600/30 text-red-200 
              border border-red-400/40
            "
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};
