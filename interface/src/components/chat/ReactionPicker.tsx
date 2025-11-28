// src/components/Chat/ReactionPicker.tsx

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const REACTION_OPTIONS = [
  { key: "good", emoji: "👍" },
  { key: "bad", emoji: "👎" },
  { key: "funny", emoji: "😂" },
  { key: "offensive", emoji: "🚫" },
  { key: "weird", emoji: "😐" },
  { key: "love", emoji: "❤️" },
] as const;

export type ReactionKey = (typeof REACTION_OPTIONS)[number]["key"];

export interface ReactionPickerAnchor {
  // viewport coords of the message bubble
  rect: DOMRect;
}

interface Props {
  anchor: ReactionPickerAnchor | null;
  isOpen: boolean;
  onSelect: (reaction: ReactionKey) => void;
  onClose: () => void;
}

const ReactionPicker: React.FC<Props> = ({
  anchor,
  isOpen,
  onSelect,
  onClose,
}) => {
  const positionStyle = useMemo(() => {
    if (!anchor) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const rect = anchor.rect;

    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : 800;
    const viewportHeight =
      typeof window !== "undefined" ? window.innerHeight : 600;

    const centerX = rect.left + rect.width / 2;
    const above = rect.top > viewportHeight / 2;

    // Base positions
    let top = above ? rect.top - 8 : rect.bottom + 8;
    let left = centerX;

    // Clamp horizontally so it never goes off screen
    const margin = 12;
    left = Math.max(margin, Math.min(viewportWidth - margin, left));

    return {
      top,
      left,
      transform: "translateX(-50%)",
    };
  }, [anchor]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* transparent click-catcher */}
          <div className="absolute inset-0" />

          {/* anchored pill */}
          <motion.div
            className="absolute z-50"
            style={positionStyle}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex gap-3 px-3 py-2 rounded-full
                         bg-[rgba(32,32,32,0.92)] backdrop-blur-md
                         shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
            >
              {REACTION_OPTIONS.map((r) => (
                <motion.button
                  key={r.key}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    onSelect(r.key);
                    onClose();
                  }}
                  className="text-2xl leading-none select-none"
                >
                  {r.emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReactionPicker;
