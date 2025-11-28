// src/components/Chat/ChatMessageBubble.tsx

import { Sparkles, Trash2, Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactionBurst from "./ReactionBurst";
import AudioBubble from "./AudioBubble";


interface Props {
  msg: any;
  isLastOther: boolean;
  formatTime: (ts: string) => string;
  reqAI: () => void;
  setZoomedImage: (src: string) => void;

  onDelete: (messageId: string) => void;
  onReact: (messageId: string, rect: DOMRect) => void;

  currentUserId?: string;
}

const BASE = "http://127.0.0.1:8000";

const ChatMessageBubble = ({
  msg,
  isLastOther,
  formatTime,
  reqAI,
  setZoomedImage,
  onDelete,
  onReact,
  currentUserId,
}: Props) => {
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const [localBurst, setLocalBurst] = useState(false);
  const [remotePulse, setRemotePulse] = useState(false);

  const prevReactionsRef = useRef<Record<string, string> | undefined>(
    msg.reactions
  );
  const [justReacted, setJustReacted] = useState(false);

  const handleReactClick = () => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    setJustReacted(true); // mark that *I* initiated
    onReact(msg.id, rect);
  };

  // 🔍 Compute reaction counts + whether "I" reacted
  const reactions: Record<string, string> = msg.reactions || {};
  const entries = Object.entries(reactions); // [ [userId, reaction], ... ]

  const myId = currentUserId;
  const myReaction = myId ? reactions[myId] : undefined;

  const reactionCounts: { key: string; emoji: string; count: number; isMine: boolean }[] =
    (() => {
      if (!entries.length) return [];

      const map = new Map<string, { emoji: string; count: number; isMine: boolean }>();

      for (const [userId, reactionKey] of entries) {
        const emoji =
          reactionKey === "good"
            ? "👍"
            : reactionKey === "bad"
            ? "👎"
            : reactionKey === "funny"
            ? "😂"
            : reactionKey === "offensive"
            ? "🚫"
            : reactionKey === "weird"
            ? "😐"
            : reactionKey === "love"
            ? "❤️"
            : "❓";

        const prev = map.get(reactionKey) || {
          emoji,
          count: 0,
          isMine: false,
        };

        prev.count += 1;
        if (myId && userId === myId) {
          prev.isMine = true;
        }

        map.set(reactionKey, prev);
      }

      return Array.from(map.entries()).map(([key, v]) => ({
        key,
        emoji: v.emoji,
        count: v.count,
        isMine: v.isMine,
      }));
    })();

  // 🧠 Detect when reactions change to trigger animations
  useEffect(() => {
    const prev = prevReactionsRef.current || {};
    const curr = reactions;

    const prevJson = JSON.stringify(prev);
    const currJson = JSON.stringify(curr);

    if (prevJson === currJson) return;

    const prevMine = myId ? prev[myId] : undefined;
    const currMine = myId ? curr[myId] : undefined;

    if (justReacted && currMine && currMine !== prevMine) {
      // 👉 Local user reaction confirmed by backend
      setLocalBurst(true);
      setJustReacted(false);
    } else if (!justReacted && prevJson !== currJson) {
      // 👉 Reaction change but I didn't initiate just now → remote
      setRemotePulse(true);
      setTimeout(() => setRemotePulse(false), 220);
    }

    prevReactionsRef.current = curr;
  }, [reactions, myId, justReacted]);

  const isUser = msg.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[75%]">
        <motion.div
          ref={bubbleRef}
          className={`chat-bubble relative flex flex-col ${
            isUser ? "bubble-user" : "bubble-other"
          }`}
          animate={
            localBurst
              ? { scale: [1, 1.04, 1] }
              : remotePulse
              ? { scale: [1, 1.02, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.22 }}
          onAnimationComplete={() => {
            setLocalBurst(false);
            setRemotePulse(false);
          }}
        >
          {/* LOCAL BURST */}
          <ReactionBurst active={localBurst} />

          {/* MEDIA + TEXT */}
          <div>
            {msg.message_type === "image" && (
              <img
                src={BASE + msg.media_url}
                className="max-w-[220px] rounded-lg mb-1 cursor-pointer"
                onClick={() => setZoomedImage(BASE + msg.media_url)}
              />
            )}

            {msg.message_type === "video" && (
              <video
                src={BASE + msg.media_url}
                controls
                className="max-w-[240px] rounded-lg mb-1"
              />
            )}

            {/* {msg.message_type === "audio" && (
              <audio
                controls
                src={BASE + msg.media_url}
                className="w-48 mb-1"
              />
            )} */}
            {msg.message_type === "audio" && (
                <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                  <AudioBubble url={msg.media_url} />
                </div>
            )}

            {msg.message_type === "file" && (
              <a
                href={BASE + msg.media_url}
                target="_blank"
                rel="noreferrer"
                className="underline text-cyan-300"
              >
                Download file
              </a>
            )}

            {msg.text && <div>{msg.text}</div>}
          </div>

          {/* TIME */}
          <div className="bubble-time">
            <i className="text-gray-400">{formatTime(msg.timestamp)}</i>
          </div>

          {/* ACTION ICONS */}
          <div className="flex gap-2 absolute -bottom-5 right-0">
            {isUser && (
              <button onClick={() => onDelete(msg.id)}>
                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
              </button>
            )}

            <button onClick={handleReactClick}>
              <Flag className="w-4 h-4 text-yellow-400 hover:text-yellow-300" />
            </button>
          </div>
        </motion.div>

        {/* REACTION BAR (WhatsApp style) */}
        <AnimatePresence>
          {reactionCounts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 2 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className={`mt-1 inline-flex rounded-full bg-white/5 backdrop-blur-md px-1 py-[2px] gap-1 ${
                isUser ? "ml-auto" : ""
              }`}
            >
              {reactionCounts.map((r) => (
                <motion.div
                  key={r.key}
                  layout
                  initial={{ opacity: 0, scale: 0.6, y: 2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.4, y: 2 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className={`flex items-center gap-1 px-2 py-[2px] rounded-full ${
                    r.isMine
                      ? "bg-blue-500/30 text-white border border-blue-400/60"
                      : "bg-white/8 text-white"
                  }`}
                >
                  <span className="text-[15px] leading-none">{r.emoji}</span>
                  {r.count > 1 && (
                    <span className="text-[11px] text-gray-100 leading-none">
                      {r.count}
                    </span>
                  )}
                  {r.isMine && (
                    <span className="text-[10px] uppercase tracking-[0.06em] text-blue-100">
                      You
                    </span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI button */}
      {isLastOther && (
        <button onClick={reqAI} className="ai-button ml-2 mt-2">
          <Sparkles className="w-4 h-4 text-white drop-shadow" />
        </button>
      )}
    </div>
  );
};

export default ChatMessageBubble;