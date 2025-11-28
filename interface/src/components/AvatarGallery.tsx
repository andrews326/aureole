// ─────────────────────────────────────────────────────────────
//  AVATAR GALLERY — Neon Glow Raya-Style Gallery (Hero + 4 Medium)
// ─────────────────────────────────────────────────────────────

// components/AvatarGallery.tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarGalleryProps {
  photos?: string[];
  onOpen: (index: number) => void;
}

export default function AvatarGallery({ photos, onOpen }: AvatarGalleryProps) {
  const [scrollPos, setScrollPos] = useState(0);
  const scrollBy = (dir: number) => {
    const container = document.getElementById("circular-gallery");
    if (!container) return;
    container.scrollBy({ left: dir * 250, behavior: "smooth" });
    setScrollPos(container.scrollLeft + dir * 250);
  };

  return (
    <div className="relative w-full my-8">
      {/* Scroll buttons */}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm"
        onClick={() => scrollBy(-1)}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div
        id="circular-gallery"
        className="flex gap-4 overflow-x-auto scrollbar-hide px-12 pb-3"
      >
        {photos.map((src, i) => (
          <div
            key={i}
            onClick={() => onOpen(i)}
            className={cn(
              "relative w-28 h-28 flex-shrink-0 rounded-full overflow-hidden cursor-pointer neon-border group",
              "transition-all duration-300 hover:scale-105"
            )}
          >
            <img
              src={src}
              alt={`user media ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover rounded-full"
            />
            <div className="absolute inset-0 neon-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      <button
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm"
        onClick={() => scrollBy(1)}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}