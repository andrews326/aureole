// src/components/Chat/ChatEmojiDrawer.tsx


import { X } from "lucide-react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

interface Props {
  show: boolean;
  onClose: () => void;
  insertEmoji: (emoji: any) => void;
}

const ChatEmojiDrawer = ({ show, onClose, insertEmoji }: Props) => {
  return (
    <>
      {/* OVERLAY */}
      {show && (
        <div
          className="emoji-overlay fixed inset-0 z-[9998]"
          onClick={onClose}
        />
      )}

      {/* EMOJI DRAWER */}
      <div
        className={`
          emoji-drawer-center fixed bottom-20 left-1/2 -translate-x-1/2
          transition-all duration-300 z-[9999]
          ${show
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-6 opacity-0 scale-95 pointer-events-none"
          }
        `}
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full 
          bg-white/20 hover:bg-white/30 transition"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* EMOJI PICKER */}
        <div className="emoji-drawer-inner p-3 pt-10 rounded-xl overflow-y-auto">
          <Picker
            data={emojiData}
            onEmojiSelect={insertEmoji}
            previewPosition="none"
            theme="dark"
          />
        </div>
      </div>
    </>
  );
};

export default ChatEmojiDrawer;
