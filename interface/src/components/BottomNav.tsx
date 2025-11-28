// src/components/BottomNav.tsx

import { Compass, Heart, Bell, User, Power } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { useState } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { clearAuth } from "@/redux/slices/authSlice";
import { logoutAll } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const BottomNav = () => {
  const unread = useSelector((s: RootState) => s.notifications.unread);
  const hoverLabel = useState<string | null>(null)[0];
  const setHoverLabel = useState<string | null>(null)[1];

  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const navigate = useNavigate();
  const token = useSelector((s: RootState) => s.auth.token);

  const handleLogout = async () => {
    try {
      await logoutAll(token);
    } catch {}

    dispatch(clearAuth());
    toast({ title: "Logged out", description: "Session cleared." });
    navigate("/auth");
  };

  const navItems = [
    { to: "/discovery", icon: Compass, label: "Discovery", type: "nav" },
    { to: "/matches", icon: Heart, label: "Matches", type: "nav" },
    { to: "/notification", icon: Bell, label: "Alerts", type: "nav" },
    { to: "/profile", icon: User, label: "Profile", type: "nav" },
    { icon: Power, label: "Logout", type: "action", onClick: handleLogout },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe select-none">
      <div className="relative mx-auto max-w-lg bg-black/30 backdrop-blur-xl border-t border-white/10 h-20 rounded-t-3xl overflow-hidden">

        {/* Top glow line */}
        <div className="absolute top-0 left-0 h-[2px] w-full opacity-40 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-[galaxySlide_5s_linear_infinite]" />

        <div className="flex justify-between items-center h-full px-7">
          {navItems.map((item, i) => {
            const isAction = item.type === "action";
            const badge = item.label === "Alerts" ? unread : 0;

            return (
              <div
                key={i}
                className="relative flex flex-col items-center group"
                onMouseEnter={() => setHoverLabel(item.label)}
                onMouseLeave={() => setHoverLabel(null)}
              >
                {/* TOOLTIP ABOVE */}
                {hoverLabel === item.label && (
                  <div className="absolute -top-10 px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-xl border border-cyan-300/30 animate-fadeIn cosmic-tooltip">
                    {item.label}
                  </div>
                )}

                {/* ACTION BUTTON */}
                {isAction ? (
                  <button
                    onClick={item.onClick}
                    className="relative flex items-center justify-center w-12 h-12 transition-all"
                  >
                    <item.icon className="w-7 h-7 text-red-400 group-hover:text-red-300 transition" />
                  </button>
                ) : (
                  /* NAV LINK */
                  <NavLink
                    to={item.to!}
                    className="relative flex items-center justify-center w-12 h-12"
                    activeClassName="text-cyan-300"
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            "w-7 h-7 transition-all",
                            "text-gray-300 group-hover:text-white",
                            isActive && "text-cyan-300 scale-125 drop-shadow-[0_0_12px_rgba(0,255,255,0.8)]"
                          )}
                        />

                        {badge > 0 && (
                          <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[3px] text-[10px] font-bold flex items-center justify-center rounded-full bg-pink-500 text-white animate-pingSlow">
                            {badge > 9 ? "9+" : badge}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes galaxySlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes pingSlow {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0px); }
        }

        .animate-fadeIn {
          animation: fadeIn .25s ease-out forwards;
        }

        /* COSMIC TOOLTIP STYLE */
        .cosmic-tooltip {
          box-shadow: 0 0 18px rgba(0, 255, 255, 0.4), 0 0 28px rgba(170, 80, 255, 0.3);
        }
      `}</style>
    </nav>
  );
};

export default BottomNav;