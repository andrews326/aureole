// ─────────────────────────────────────────────────────────────
//  PHOTO VIEWER MODAL — Fullscreen Neon Viewer (Zoom + Swipe)
// ─────────────────────────────────────────────────────────────

// components/PhotoViewerModal.tsx
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  photos: string[];
  index: number;
  onClose: () => void;
  onSetAvatar: (src: string) => void;
  onDelete: (src: string) => void;
}

export default function PhotoViewerModal({
  photos,
  index,
  onClose,
  onSetAvatar,
  onDelete,
}: Props) {
  const [current, setCurrent] = useState(index);
  const total = photos.length;

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current]);

  const prev = () => setCurrent((c) => (c > 0 ? c - 1 : total - 1));
  const next = () => setCurrent((c) => (c < total - 1 ? c + 1 : 0));

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[999] flex flex-col items-center justify-center backdrop-blur-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 p-3 rounded-full bg-black/50 hover:bg-black/70 transition text-white"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Nav arrows */}
      {total > 1 && (
        <>
          <button
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-3 rounded-full text-white"
            onClick={prev}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-3 rounded-full text-white"
            onClick={next}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image */}
      <img
        src={photos[current]}
        alt={`Photo ${current + 1}`}
        className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain shadow-lg neon-border"
      />

      {/* Action bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 px-6 py-3 rounded-full backdrop-blur-md">
        <button
          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
          onClick={() => onSetAvatar(photos[current])}
        >
          <Star className="w-4 h-4" /> Set Avatar
        </button>
        <button
          className="text-red-400 hover:text-red-300 flex items-center gap-2"
          onClick={() => onDelete(photos[current])}
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
}
