// src/pages/Chat/Chat.tsx

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import CosmicBackground from "@/components/CosmicBackground";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";

import {
  addMessage,
  addAISuggestions,
  clearConversation,
  markAsDelivered,
  markAsRead,
  setConnected,
  setError,
  updateReaction,
  removeReaction,
} from "@/redux/slices/chatSlice";

import api from "@/services/api";
import { insightService, mediaService, messageActions } from "@/services/sessionService";

import {
  PersistentChatService,
  EventMessage,
} from "@/services/chatService";

import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import ChatEmojiDrawer from "@/components/chat/ChatEmojiDrawer";
import ChatImageZoom from "@/components/chat/ChatImageZoom";
import { createVoiceRecorder } from "@/utils/voiceRecorder";
import { sendVoiceMessage } from "@/utils/sendVoiceUpload";


import { RootState } from "@/redux/store";
import "@/components/chat/chat.css";
import ReactionPicker from "@/components/chat/ReactionPicker";


type ReactionTarget = {
  messageId: string;
  anchorRect: DOMRect;
};


const Chat = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { userId: partnerId } = useParams<{ userId: string }>();

  const { token, user } = useAppSelector((s: RootState) => s.auth);

  const messages = useAppSelector((s: RootState) =>
    partnerId ? s.chat.conversations[partnerId] ?? [] : []
  );

  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // NEW: which message is currently being reacted to
  // const [reactTargetId, setReactTargetId] = useState<string | null>(null);
  const [reactionTarget, setReactionTarget] = useState<ReactionTarget | null>(null);
  // NEW: simple local deleted IDs so we don’t touch Redux
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const chatServiceRef = useRef<PersistentChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const recorderRef = useRef(createVoiceRecorder());
  const [isRecording, setIsRecording] = useState(false);


  // ----------------------------------------------------------------
  // LAST INCOMING MESSAGE (for AI)
  // ----------------------------------------------------------------
  const lastIncoming = [...messages]
    .filter((m) => m.sender === "other" && !m.id.startsWith("temp"))
    .at(-1);

  const aiSuggestions = useAppSelector((s) =>
    lastIncoming ? s.chat.aiSuggestions[lastIncoming.id]?.replies ?? [] : []
  );

  // ----------------------------------------------------------------
  // LOAD PARTNER INFO
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!partnerId || !token) return;

    insightService
      .getEnrichedInsights()
      .then((res) => {
        const list = res.data;
        if (!Array.isArray(list)) return;

        const partner = list.find((u) => u.user_id === partnerId);
        if (!partner) return;

        setPartnerInfo({
          id: partner.user_id,
          full_name: partner.full_name,
          age: partner.age,
          avatar: partner.avatar,
          is_online: partner.is_online,
          ai_summary: partner.ai_summary,
        });
      })
      .catch(() => {});
  }, [partnerId, token]);

  // ----------------------------------------------------------------
  // LOAD HISTORY
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!partnerId || !user?.id) return;

    let cancel = false;

    const loadHistory = async () => {
      dispatch(clearConversation(partnerId));

      try {
        const r = await api.get(`/session/messages/${partnerId}`, {
          params: { limit: 50, offset: 0 },
        });

        if (!Array.isArray(r.data)) return;

        for (const raw of r.data) {
          if (cancel) return;

          dispatch(
            addMessage({
              id: raw.id,
              text: raw.content,
              sender: raw.sender_id === user.id ? "user" : "other",
              timestamp: raw.created_at,
              is_delivered: raw.is_delivered,
              is_read: raw.is_read,
              sender_id: raw.sender_id,
              receiver_id: raw.receiver_id,
              partnerId:
                raw.sender_id === user.id ? raw.receiver_id : raw.sender_id,
              myUserId: user.id,

              message_type: raw.message_type,
              media_id: raw.media_id,
              media_url: raw.media_url,
              thumb_url: raw.thumb_url,
              reactions: raw.reactions || {},
            })
          );
        }
      } catch (err) {
        console.error("❌ HISTORY FAILED:", err);
      }
    };

    loadHistory();
    return () => {
      cancel = true;
    };
  }, [partnerId, user?.id]);

  // ----------------------------------------------------------------
// WEBSOCKET SETUP (FULL LIFECYCLE SAFE)
// ----------------------------------------------------------------
useEffect(() => {
  if (!user?.id) return;

  // Cleanup any previous instance
  if (chatServiceRef.current) {
    chatServiceRef.current.disconnect();
    chatServiceRef.current = null;
  }

  const svc = new PersistentChatService(user.id);
  chatServiceRef.current = svc;

  svc.connect();
  dispatch(setConnected(true));

  svc.onMessage((evt: EventMessage) => {
    switch (evt.type) {
      case "message":
        dispatch(
          addMessage({
            id: evt.message_id,
            text: evt.content,
            sender: evt.sender_id === user.id ? "user" : "other",
            timestamp: evt.timestamp ?? new Date().toISOString(),
            is_delivered: true,
            is_read: false,
            sender_id: evt.sender_id,
            receiver_id: evt.receiver_id,
            partnerId:
              evt.sender_id === user.id
                ? evt.receiver_id
                : evt.sender_id,
            myUserId: user.id,
          })
        );
        break;

      case "delivery_receipt":
        dispatch(markAsDelivered(evt.message_id));
        break;

      case "read_receipt":
        evt.message_ids.forEach((id) => dispatch(markAsRead(id)));
        break;

      case "ai_suggestions":
        dispatch(addAISuggestions(evt));
        break;

      case "message_deleted": {
        const id = (evt as any).message_id;
        if (id) {
          setDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }
        break;
      }

      case "error":
        dispatch(setError(evt.message));
        break;

        case "message_reaction":
          dispatch(updateReaction({
            messageId: evt.message_id,
            userId: evt.user_id,
            reaction: evt.reaction,
          }));
          break;
        
        case "message_reaction_removed":
          dispatch(removeReaction({
            messageId: evt.message_id,
            userId: evt.user_id,
          }));
          break;
        
    }
  });

  return () => {
    svc.disconnect();
  };
}, [user?.id]);   // 🔥 reconnects when user changes


  // ----------------------------------------------------------------
  // SCROLL
  // ----------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiSuggestions]);

  // ----------------------------------------------------------------
  // SEND MESSAGE
  // ----------------------------------------------------------------
  const send = (e: any) => {
    e.preventDefault();
    if (!inputText.trim() || !partnerId || !user?.id) return;

    const text = inputText.trim();
    const tempId = `temp-${Date.now()}`;

    dispatch(
      addMessage({
        id: tempId,
        text,
        sender: "user",
        timestamp: new Date().toISOString(),
        is_delivered: false,
        is_read: false,
        partnerId,
        sender_id: user.id,
        receiver_id: partnerId,
        myUserId: user.id,
      })
    );

    setInputText("");
    chatServiceRef.current?.sendMessage(partnerId, text);
  };

  // ----------------------------------------------------------------
  // AI SUGGESTIONS
  // ----------------------------------------------------------------
  const reqAI = () =>
    lastIncoming && chatServiceRef.current?.requestAISuggestions(lastIncoming.id);

  const sendAI = (content: string) => {
    if (!partnerId || !user?.id) return;

    const tempId = `temp-ai-${Date.now()}`;

    dispatch(
      addMessage({
        id: tempId,
        text: content,
        sender: "user",
        timestamp: new Date().toISOString(),
        is_delivered: false,
        is_read: false,
        partnerId,
        sender_id: user.id,
        receiver_id: partnerId,
        myUserId: user.id,
      })
    );

    chatServiceRef.current?.sendSelectedAIReply(partnerId, content);

    if (lastIncoming) {
      dispatch(
        addAISuggestions({
          original_message_id: lastIncoming.id,
          replies: [],
        })
      );
    }
  };

  // ----------------------------------------------------------------
  // FILE UPLOAD
  // ----------------------------------------------------------------
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.length || !partnerId || !user?.id) return;

    const file = e.target.files[0];
    const uploaded = await mediaService.uploadChatMedia(file);

    const tempId = `temp-media-${Date.now()}`;

    dispatch(
      addMessage({
        id: tempId,
        text: "",
        sender: "user",
        timestamp: new Date().toISOString(),
        is_delivered: false,
        is_read: false,
        message_type: uploaded.kind,
        media_id: uploaded.media_id,
        media_url: uploaded.url,
        thumb_url: uploaded.thumb,
        partnerId,
        sender_id: user.id,
        receiver_id: partnerId,
        myUserId: user.id,
      })
    );

    chatServiceRef.current?.sendMessageMedia({
      receiver_id: partnerId,
      message_type: uploaded.kind,
      media_id: uploaded.media_id,
      content: "",
    });

    e.target.value = "";
  };

  // ----------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------
  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const autoGrow = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 300) + "px";
  };

  const insertEmoji = (emoji: any) => {
    const char = emoji.native ?? "";
    const ta = textareaRef.current;

    if (!ta) {
      setInputText((v) => v + char);
      return;
    }

    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    const newText = inputText.slice(0, start) + char + inputText.slice(end);
    setInputText(newText);

    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + char.length;
      autoGrow();
    });
  };

  // ----------------------------------------------------------------
  // DELETE + REACTION HANDLERS
  // ----------------------------------------------------------------
  const handleDelete = async (messageId: string) => {
    try {
      await messageActions.deleteMessage(messageId);
      setDeletedIds((prev) =>
        prev.includes(messageId) ? prev : [...prev, messageId]
      );
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const handleReact = (messageId: string, rect: DOMRect) => {
  setReactionTarget({ messageId, anchorRect: rect });
};


const handleReactionSelect = async (reaction: string) => {
  if (!reactionTarget) return;

  try {
    await messageActions.reactMessage(reactionTarget.messageId, reaction);
  } catch (err) {
    console.error("Failed to react to message", err);
  } finally {
    setReactionTarget(null);
  }
};


const closeReactionModal = () => setReactionTarget(null);

  // Filter out locally deleted messages from view only
  const visibleMessages = messages.filter(
    (m) => !deletedIds.includes(m.id)
  );

  const startRecording = async (waveCb: (v: number) => void) => {
    console.log("🎤 startRecording() CALLED");
    await recorderRef.current.start(waveCb);
  };
  
  const stopRecording = async (cancelled: boolean) => {
    console.log("🛑 stopRecording() CALLED, cancelled?", cancelled);
    const blob = await recorderRef.current.stop();
  
    console.log("📦 blob produced:", blob, blob.size);
  
    // Reject silent or too small
    if (cancelled || blob.size < 300) {
      console.log("⚠️ Voice cancelled or too small, ignoring");
      return;
    }
  
    if (!partnerId || !chatServiceRef.current) return;
  
    const uploaded = await sendVoiceMessage(partnerId, blob, chatServiceRef.current);
  
    console.log("📨 voice uploaded + WS sent", uploaded);
  
    // Immediately show pending message
    const tempId = `temp-voice-${Date.now()}`;
  
    dispatch(
      addMessage({
        id: tempId,
        text: "",
        sender: "user",
        timestamp: new Date().toISOString(),
        is_delivered: false,
        is_read: false,
        partnerId,
        sender_id: user.id,
        receiver_id: partnerId,
        myUserId: user.id,
        message_type: "audio",
        media_id: uploaded.media_id,
        media_url: uploaded.url,       // already absolute
        thumb_url: uploaded.thumb,
      })
    );
  };    

  // ----------------------------------------------------------------
  // UI
  // ----------------------------------------------------------------
  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <CosmicBackground />

      <ChatHeader partner={partnerInfo} />

      <ChatMessages
        messages={visibleMessages}
        lastIncoming={lastIncoming}
        aiSuggestions={aiSuggestions}
        formatTime={formatTime}
        reqAI={reqAI}
        sendAI={sendAI}
        setZoomedImage={setZoomedImage}
        endRef={messagesEndRef}
        handleDelete={handleDelete}
        handleReact={handleReact}
        currentUserId={user.id}
      />

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        send={send}
        handleFileUpload={handleFileUpload}
        toggleEmoji={() => setShowEmoji((v) => !v)}
        textareaRef={textareaRef}
        autoGrow={autoGrow}
        startRecording={startRecording}
        stopRecording={stopRecording}
        isRecording={isRecording}
      />

      <ChatEmojiDrawer
        show={showEmoji}
        onClose={() => setShowEmoji(false)}
        insertEmoji={insertEmoji}
      />

      <ChatImageZoom
        src={zoomedImage}
        onClose={() => setZoomedImage(null)}
      />

      {reactionTarget && (
        <ReactionPicker
          isOpen={!!reactionTarget}
          anchor={reactionTarget ? { rect: reactionTarget.anchorRect } : null}
          onSelect={handleReactionSelect}
          onClose={closeReactionModal}
        />
      )}

    </div>
  );
};

export default Chat;