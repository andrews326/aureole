// src/components/Chat/ChatMessages.tsx


import ChatMessageBubble from "./ChatMessageBubble";

interface Props {
  messages: any[];
  lastIncoming: any;
  aiSuggestions: string[];
  formatTime: (ts: string) => string;
  reqAI: () => void;
  sendAI: (content: string) => void;
  setZoomedImage: (src: string) => void;
  endRef: React.RefObject<HTMLDivElement>;

  handleDelete: (id: string) => void;
  handleReact: (id: string, rect: DOMRect) => void;

  currentUserId?: string;
}

const ChatMessages = ({
  messages,
  lastIncoming,
  aiSuggestions,
  formatTime,
  reqAI,
  sendAI,
  setZoomedImage,
  endRef,
  handleDelete,     
  handleReact,
  currentUserId,
}: Props) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-28 pb-40 space-y-7">

      {messages.map((msg) => (
        <ChatMessageBubble
          key={msg.id}
          msg={msg}
          formatTime={formatTime}
          isLastOther={msg.id === lastIncoming?.id && msg.sender === "other"}
          reqAI={reqAI}
          setZoomedImage={setZoomedImage}
          onDelete={handleDelete}         // ✔ NEW
          onReact={handleReact} 
          currentUserId={currentUserId}
        />
      ))}

      {/* AI SUGGESTIONS */}
      {aiSuggestions.length > 0 && (
        <div className="ai-suggestions-wrapper pl-2">
          {aiSuggestions.map((s, i) => (
            <button key={i} onClick={() => sendAI(s)} className="ai-pill">
              <div className="halo" />
              {s}
            </button>
          ))}
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
};

export default ChatMessages;