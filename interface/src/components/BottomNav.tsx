// src/components/BottomNav.tsx


import { Compass, Heart, MessageCircle, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notification";

const navItems = [
  { to: "/discovery", icon: Compass, label: "Discovery", notifKey: null },
  { to: "/matches", icon: Heart, label: "Matches", notifKey: "matches" as const },
  { to: "/chat", icon: MessageCircle, label: "Chat", notifKey: "messages" as const },
  { to: "/profile", icon: User, label: "Profile", notifKey: null },
];

export const BottomNav = () => {
  const { unreadCounts } = useNotifications();

  const getBadgeCount = (notifKey: "matches" | "messages" | null) => {
    if (!notifKey) return 0;
    return unreadCounts[notifKey];
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass-card border-t border-white/10 backdrop-blur-xl bg-background/60">
        <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-4">
          {navItems.map((item) => {
            const badgeCount = getBadgeCount(item.notifKey);
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg relative",
                  "transition-all duration-300 ease-out",
                  "hover:scale-110 hover:bg-primary/10",
                  "text-muted-foreground"
                )}
                activeClassName="text-primary cosmic-glow scale-110"
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <item.icon
                        className={cn(
                          "w-6 h-6 transition-all duration-300",
                          isActive && "animate-pulse"
                        )}
                      />
                      {badgeCount > 0 && (
                        <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-accent text-accent-foreground text-[10px] font-bold rounded-full animate-glow px-1">
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};