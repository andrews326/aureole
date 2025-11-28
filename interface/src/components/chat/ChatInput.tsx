// src/components/Chat/ChatInput.tsx


import { Plus, Smile, Send  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import VoiceMic from "./VoiceMic";


interface Props {
  inputText: string;
  setInputText: (v: string) => void;
  send: (e: React.FormEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleEmoji: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  autoGrow: () => void;

  startRecording: (cb: (v: number) => void) => void;
  stopRecording: (cancelled: boolean) => void;
  isRecording: boolean;
}

const ChatInput = ({
  inputText,
  setInputText,
  send,
  handleFileUpload,
  toggleEmoji,
  textareaRef,
  autoGrow,
  startRecording,
  stopRecording,
  isRecording,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(e);
      }}
      className="absolute bottom-4 left-0 right-0 px-4 z-30"
    >
      <div className="glass-inputbar flex items-center gap-3 p-3 rounded-2xl">

        {/* + FILE BUTTON */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.zip"
          onChange={handleFileUpload}
        />

        {/* EMOJI BUTTON */}
        <button
          type="button"
          onClick={toggleEmoji}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          <Smile className="w-5 h-5 text-white" />
        </button>

        {/* MIC BUTTON (press + slide) */}
        <VoiceMic startRecording={startRecording} stopRecording={stopRecording} />

        {/* TEXTAREA */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            autoGrow();
          }}
          onInput={autoGrow}
          placeholder="Message…"
          className="bg-transparent border-0 text-white placeholder:text-white/40 w-full resize-none outline-none leading-6 max-h-[300px]"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
        />

<Button type="submit" size="icon" className="send-btn">
  <Send className="w-5 h-5" />
</Button>
      </div>
    </form>
  );
};

export default ChatInput;