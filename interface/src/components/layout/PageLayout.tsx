// src/components/layout/PageLayout.tsx
import React from "react";
import CosmicBackground from "../CosmicBackground";
import logo from "../../assets/logo_2.png";

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        pt-[env(safe-area-inset-top)]
        pb-[86px]
        px-[env(safe-area-inset-left)]
        pr-[env(safe-area-inset-right)]
        min-h-screen
        overflow-x-hidden
        relative
      "
    >
      <CosmicBackground />

      {/* Animated Watermark */}
      <img
        src={logo}
        alt="App Logo Watermark"
        className="absolute inset-0 m-auto w-72 opacity-65 pointer-events-none select-none animate-breathe"
      />

      {children}

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.05); }
        }
        .animate-breathe {
          animation: breathe 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}