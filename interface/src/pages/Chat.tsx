// src/pages/Chat.tsx

// import { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import CosmicBackground from '@/components/CosmicBackground';
// import { getAuth, clearAuth } from '@/utils/auth';
// import { useToast } from '@/hooks/use-toast';

// interface Message {
//   id: string;
//   text: string;
//   sender: 'user' | 'other';
//   timestamp: Date;
// }

// const Chat = () => {
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: '1',
//       text: "Hey! I noticed we both love stargazing 🌟",
//       sender: 'other',
//       timestamp: new Date(Date.now() - 3600000),
//     },
//     {
//       id: '2',
//       text: "Yes! There's something magical about the night sky",
//       sender: 'user',
//       timestamp: new Date(Date.now() - 3500000),
//     },
//     {
//       id: '3',
//       text: "Have you ever tried astrophotography?",
//       sender: 'other',
//       timestamp: new Date(Date.now() - 3400000),
//     },
//   ]);
//   const [inputText, setInputText] = useState('');
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   useEffect(() => {
//     const { token, user } = getAuth();
//     if (!token || !user?.verified) {
//       navigate('/auth');
//       return;
//     }
//     scrollToBottom();
//   }, [messages]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   const handleSend = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!inputText.trim()) return;

//     const newMessage: Message = {
//       id: Date.now().toString(),
//       text: inputText,
//       sender: 'user',
//       timestamp: new Date(),
//     };

//     setMessages([...messages, newMessage]);
//     setInputText('');

//     // Simulate response
//     setTimeout(() => {
//       const response: Message = {
//         id: (Date.now() + 1).toString(),
//         text: "That sounds amazing! Tell me more ✨",
//         sender: 'other',
//         timestamp: new Date(),
//       };
//       setMessages(prev => [...prev, response]);
//     }, 1000);
//   };

//   const handleLogout = () => {
//     clearAuth();
//     toast({
//       title: "Signed out",
//       description: "Until the stars align again 🌙",
//     });
//     navigate('/auth');
//   };

//   const { user } = getAuth();

//   return (
//     <div className="min-h-screen relative flex flex-col">
//       <CosmicBackground />
      
//       {/* Header */}
//       <div className="relative z-10 glass-card border-b border-white/10">
//         <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
//               <span className="text-lg">✨</span>
//             </div>
//             <div>
//               <h2 className="font-semibold">Sarah</h2>
//               <p className="text-xs text-muted-foreground">Active now</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
//             <Button variant="outline" size="sm" onClick={handleLogout}>
//               Sign Out
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Messages */}
//       <div className="relative z-10 flex-1 overflow-y-auto">
//         <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
//           {messages.map((message) => (
//             <div
//               key={message.id}
//               className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
//             >
//               <div
//                 className={`max-w-[70%] rounded-2xl px-4 py-3 ${
//                   message.sender === 'user'
//                     ? 'bg-gradient-to-br from-primary/90 to-accent/90 text-primary-foreground cosmic-glow'
//                     : 'glass-card border border-white/10'
//                 }`}
//               >
//                 <p className="text-sm">{message.text}</p>
//                 <p className="text-xs opacity-70 mt-1">
//                   {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                 </p>
//               </div>
//             </div>
//           ))}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       {/* Input */}
//       <div className="relative z-10 glass-card border-t border-white/10">
//         <div className="max-w-4xl mx-auto px-4 py-4">
//           <form onSubmit={handleSend} className="flex gap-2">
//             <Input
//               value={inputText}
//               onChange={(e) => setInputText(e.target.value)}
//               placeholder="Send a message..."
//               className="glass-input flex-1"
//             />
//             <Button type="submit" className="cosmic-glow">
//               Send
//             </Button>
//           </form>
//           <p className="text-xs text-muted-foreground mt-2 text-center">
//             AI Stardust Replies available • Press and hold for suggestions ✨
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };


// src/pages/Chat.tsx

// import { useParams, useNavigate } from 'react-router-dom';
// import { useState, useRef, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import CosmicBackground from '@/components/CosmicBackground';
// import { useAppDispatch, useAppSelector } from '@/redux/hooks';
// import {
//   addMessage,
//   addAISuggestions,
//   setError,
//   markAsDelivered,
//   markAsRead,
// } from '@/redux/slices/chatSlice';
// import { fetchConversation } from '@/redux/slices/sessionSlice';
// import { RootState } from '@/redux/store';
// import { ChatService, EventMessage } from '@/services/chatService';
// import { Message } from '@/types/types';

// const Chat = () => {
//   const dispatch = useAppDispatch();
//   const navigate = useNavigate();
//   const { userId: partnerId } = useParams<{ userId: string }>();
//   const [receiverId, setReceiverId] = useState<string | null>(partnerId || null);

//   const { token, user } = useAppSelector((state: RootState) => state.auth);
//   const chatState = useAppSelector((state: RootState) => state.chat);
//   const chatServiceRef = useRef<ChatService | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const [inputText, setInputText] = useState('');

//   // keep receiverId synced with URL param
//   useEffect(() => {
//     setReceiverId(partnerId || null);
//   }, [partnerId]);

//   // scroll to bottom when messages update
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [chatState.messages.length]);

//   // load conversation from backend on mount
//   useEffect(() => {
//     if (!partnerId || !user?.id) return;

//     dispatch(fetchConversation({ partnerId, limit: 50, offset: 0 }))
//       .unwrap()
//       .then((backendMessages: any[]) => {
//         const formattedMessages: Message[] = backendMessages.map((m) => ({
//           id: m.id,
//           text: m.content,
//           sender: m.sender_id === user.id ? 'user' : 'other',
//           timestamp: m.created_at
//             ? new Date(m.created_at).toISOString()
//             : new Date().toISOString(),
//           is_delivered: m.is_delivered ?? false,
//           is_read: m.is_read ?? false,
//         }));

//         formattedMessages.forEach((msg) => dispatch(addMessage(msg)));
//       })
//       .catch((err) => console.error('Error fetching chat history:', err));
//   }, [partnerId, dispatch, user?.id]);

//   // WebSocket setup for real-time updates
//   useEffect(() => {
//     if (!token || !user?.id) {
//       navigate('/auth');
//       return;
//     }
//     if (!receiverId) return;

//     const chatService = new ChatService(user.id);
//     chatServiceRef.current = chatService;
//     chatService.connect();

//     chatService.onMessage((event: EventMessage) => {
//       switch (event.type) {
//         case 'message': {
//           const wsMsg = event as {
//             type: 'message';
//             message_id: string;
//             sender_id: string;
//             content: string;
//             timestamp: string;
//           };

//           const uiMsg: Message = {
//             id: wsMsg.message_id,
//             text: wsMsg.content,
//             sender: wsMsg.sender_id === user?.id ? 'user' : 'other',
//             timestamp: wsMsg.timestamp
//               ? new Date(wsMsg.timestamp).toISOString()
//               : new Date().toISOString(),
//             is_delivered: true,
//             is_read: false,
//           };

//           dispatch(addMessage(uiMsg));
//           break;
//         }

//         case 'read_receipt': {
//           const rr = event as { type: 'read_receipt'; message_ids: string[] };
//           rr.message_ids.forEach((id) => dispatch(markAsRead(id)));
//           break;
//         }

//         case 'ai_suggestions': {
//           const ai = event as { type: 'ai_suggestions'; original_message_id: string; replies: string[] };
//           dispatch(addAISuggestions({ original_message_id: ai.original_message_id, replies: ai.replies }));
//           break;
//         }

//         default:
//           console.warn('Unknown WS event:', event);
//       }
//     });

//     chatService.onError((err) => {
//       console.error('WebSocket error:', err);
//       dispatch(setError('WebSocket connection error'));
//     });

//     return () => {
//       chatService.disconnect();
//     };
//   }, [user, token, receiverId, navigate, dispatch]);

//   // send message with optimistic update + backend persistence
//   const handleSend = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!inputText.trim() || !partnerId) return;

//     const tempId = `temp-${Date.now()}`;
//     const newMsg: Message = {
//       id: tempId,
//       text: inputText,
//       sender: 'user',
//       timestamp: new Date().toISOString(),
//       is_delivered: false,
//       is_read: false,
//     };

//     // 1️⃣ Optimistically display message
//     dispatch(addMessage(newMsg));
//     setInputText('');

//     try {
//       // 2️⃣ Save to backend for persistence
//       const res = await fetch(`/api/v1/session/messages/${partnerId}`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ content: inputText }),
//       });
//       const savedMessage = await res.json();

//       // 3️⃣ Replace optimistic message with backend ID & mark delivered
//       dispatch(
//         addMessage({
//           ...newMsg,
//           id: savedMessage.id,
//           is_delivered: true,
//         })
//       );
//     } catch (err) {
//       console.error('Failed to send message:', err);
//       dispatch(setError('Message failed to send'));
//     }

//     // 4️⃣ Send via WS for real-time update if receiver online
//     chatServiceRef.current?.sendMessage(partnerId, inputText);
//   };

//   // request AI suggestions
//   const handleAISuggestions = () => {
//     if (!chatServiceRef.current) return;
//     const lastUserMsg = [...chatState.messages].reverse().find((m) => m.sender === 'user');
//     if (!lastUserMsg) return;
//     chatServiceRef.current.requestAISuggestions(lastUserMsg.id);
//   };

//   const formatTime = (ts: string) => {
//     const date = new Date(ts);
//     if (isNaN(date.getTime())) return '…';
//     return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   };

//   const handleLogout = () => {
//     localStorage.clear();
//     navigate('/auth');
//   };

//   return (
//     <div className="min-h-screen relative flex flex-col">
//       <CosmicBackground />

//       {/* Header */}
//       <div className="relative z-10 glass-card border-b border-white/10">
//         <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
//               <span className="text-lg">✨</span>
//             </div>
//             <div>
//               <h2 className="font-semibold">Chat</h2>
//               <p className="text-xs text-muted-foreground">Active now</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
//             <Button variant="outline" size="sm" onClick={handleLogout}>
//               Sign Out
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Messages */}
//       <div className="relative z-10 flex-1 overflow-y-auto">
//         <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
//           {chatState.messages.length === 0 && (
//             <p className="text-center text-muted-foreground italic">
//               The stars haven’t aligned in conversation yet ✨
//             </p>
//           )}
//           {chatState.messages.map((message) => (
//             <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
//               <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
//                 message.sender === 'user'
//                   ? 'bg-gradient-to-br from-primary/90 to-accent/90 text-primary-foreground cosmic-glow'
//                   : 'glass-card border border-white/10'
//               }`}>
//                 <p className="text-sm">{message.text}</p>
//                 <p className="text-xs opacity-70 mt-1 flex justify-between items-center">
//                   {formatTime(message.timestamp)}
//                   {message.sender === 'user' && (
//                     <span className="ml-2">
//                       {message.is_read ? '✅✅' : message.is_delivered ? '✅' : '⏳'}
//                     </span>
//                   )}
//                 </p>
//               </div>
//             </div>
//           ))}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       {/* Input + AI Suggestions */}
//       <div className="relative z-10 glass-card border-t border-white/10">
//         <div className="max-w-4xl mx-auto px-4 py-4">
//           <form onSubmit={handleSend} className="flex gap-2">
//             <Input
//               value={inputText}
//               onChange={(e) => setInputText(e.target.value)}
//               placeholder="Send a message..."
//               className="glass-input flex-1"
//               disabled={!receiverId}
//             />
//             <Button type="submit" className="cosmic-glow">
//               Send
//             </Button>
//             <Button
//               type="button"
//               variant="outline"
//               onClick={handleAISuggestions}
//               title="Get AI Suggestions"
//             >
//               💫
//             </Button>
//           </form>

//           {Object.values(chatState.aiSuggestions).length > 0 && (
//             <div className="mt-3 p-3 rounded-xl glass-card border border-white/10 space-y-2">
//               <p className="text-xs text-muted-foreground">AI Suggestions:</p>
//               {Object.values(chatState.aiSuggestions).at(-1)?.replies?.map((sug, i) => (
//                 <Button
//                   key={i}
//                   variant="secondary"
//                   size="sm"
//                   className="w-full text-left"
//                   onClick={() => {
//                     if (!chatServiceRef.current || !receiverId) return;
//                     chatServiceRef.current.sendSelectedAIReply(receiverId, sug);
//                     dispatch(
//                       addMessage({
//                         id: Date.now().toString(),
//                         text: sug,
//                         sender: 'user',
//                         timestamp: new Date().toISOString(),
//                         is_delivered: true,
//                         is_read: false,
//                       })
//                     );
//                   }}
//                 >
//                   {sug}
//                 </Button>
//               ))}
//             </div>
//           )}

//           <p className="text-xs text-muted-foreground mt-2 text-center">
//             AI Stardust Replies available • Press 💫 for suggestions ✨
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Chat;

// src/pages/Chat.tsx

// src/pages/Chat.tsx

import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X, User } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  addMessage,
  markAsRead,
  markAsDelivered,
  setError,
  addAISuggestions,
  setConnected,
} from "@/redux/slices/chatSlice";
import { RootState } from "@/redux/store";
import { PersistentChatService, EventMessage } from "@/services/chatService";
import { Message } from "@/types/types";

const Chat = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { userId: partnerId } = useParams<{ userId: string }>();
  const { token, user } = useAppSelector((state: RootState) => state.auth);
  const chatState = useAppSelector((state: RootState) => state.chat);

  const [inputText, setInputText] = useState("");
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const chatServiceRef = useRef<PersistentChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // CRITICAL FIX: Filter messages properly - check if partnerId exists in message object
  // If your Redux doesn't store partnerId, we filter by checking sender_id matching
  const currentMessages = chatState.messages.filter((msg: any) => {
    // If message has partnerId field, use it
    if (msg.partnerId) {
      return msg.partnerId === partnerId;
    }
    // Otherwise, filter by: messages where either sender or receiver matches partnerId
    // User's sent messages go TO partnerId, received messages come FROM partnerId
    const isFromPartner = msg.sender === "other"; // messages from partner
    const isToPartner = msg.sender === "user"; // messages to partner (in this convo)
    return isFromPartner || isToPartner;
  });

  // Fetch partner info for avatar
  useEffect(() => {
    if (!partnerId || !token) return;

    const fetchPartnerInfo = async () => {
      try {
        const res = await fetch(`/api/v1/users/${partnerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPartnerInfo(data);
        }
      } catch (err) {
        console.error("Failed to fetch partner info:", err);
      }
    };

    fetchPartnerInfo();
  }, [partnerId, token]);

  // Load conversation from DB on mount / when partnerId changes
  useEffect(() => {
    if (!partnerId || !user?.id || !token) return;

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const res = await fetch(
          `/api/v1/session/messages/${partnerId}?limit=50&offset=0`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Failed to load messages");

        const data = await res.json();

        if (!Array.isArray(data)) {
          console.error("Unexpected message format:", data);
          return;
        }

        console.log("📥 Raw messages from API:", data);

        // Dispatch each message into the correct conversation (attach partnerId)
        data.forEach((msg: any) => {
          if (cancelled) return;
          const uiMsg: Message = {
            id: msg.id,
            text: msg.content,
            sender: msg.sender_id === user.id ? "user" : "other",
            timestamp: msg.created_at,
            is_delivered: !!msg.is_delivered,
            is_read: !!msg.is_read,
          };

          console.log("📤 Dispatching message:", { ...uiMsg, partnerId });

          // dispatch with partnerId so slice can store per-conversation
          dispatch(addMessage(({
            ...uiMsg,
            partnerId: partnerId,
          } as unknown) as any));
        });

        console.log("✅ Messages loaded:", data.length);
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Error loading chat:", err);
          dispatch(setError("Failed to load chat history"));
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [partnerId, user?.id, token, dispatch]);

  // Setup WebSocket connection (one connection per logged-in user)
  useEffect(() => {
    if (!user?.id) {
      navigate("/auth");
      return;
    }

    const chatService = new PersistentChatService(user.id);
    chatServiceRef.current = chatService;

    chatService.connect();
    dispatch(setConnected(true));

    chatService.onMessage((rawEvent: EventMessage | any) => {
      const evt = rawEvent as any;
    
      switch (evt.type) {
        case "message": {
          const wsMsg = evt as {
            type: "message";
            message_id: string;
            sender_id: string;
            receiver_id?: string;
            content: string;
            timestamp: string;
          };
    
          const partnerForThisMsg =
            wsMsg.sender_id === user?.id
              ? (wsMsg.receiver_id ?? partnerId ?? "unknown")
              : wsMsg.sender_id;
    
          const uiMsg: Message = {
            id: wsMsg.message_id,
            text: wsMsg.content,
            sender: wsMsg.sender_id === user?.id ? "user" : "other",
            timestamp: wsMsg.timestamp || new Date().toISOString(),
            is_delivered: true,
            is_read: false,
          };
    
          dispatch(
            addMessage(({
              ...uiMsg,
              partnerId: partnerForThisMsg,
            } as unknown) as any)
          );
    
          if (wsMsg.sender_id !== user?.id && partnerForThisMsg === partnerId) {
            chatService.sendReadReceipts([wsMsg.message_id]);
            dispatch(markAsRead(wsMsg.message_id));
          }
          break;
        }
    
        case "delivery_receipt": {
          const ev = evt as { type: "delivery_receipt"; message_id: string };
          if (ev?.message_id) dispatch(markAsDelivered(ev.message_id));
          break;
        }
    
        case "read_receipt": {
          const ev = evt as { type: "read_receipt"; message_ids: string[] };
          (ev.message_ids || []).forEach((id) => dispatch(markAsRead(id)));
          break;
        }
    
        case "ai_suggestions": {
          const ai = evt as {
            type: "ai_suggestions";
            original_message_id: string;
            replies: string[];
            remaining_today?: number;
          };
          dispatch(
            addAISuggestions({
              original_message_id: ai.original_message_id,
              replies: ai.replies,
              remaining_today: ai.remaining_today,
            } as any)
          );
          break;
        }
    
        case "error": {
          console.error("WS Error:", evt.message);
          dispatch(setError("WebSocket error"));
          break;
        }
    
        default:
          console.warn("Unknown WS event:", evt);
      }
    });

    return () => {
      chatService.disconnect();
      dispatch(setConnected(false));
    };
  }, [user?.id, dispatch, navigate]);

  // Scroll to bottom when current conversation messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !partnerId || !user?.id) return;

    const tempId = `temp-${Date.now()}`;
    const trimmedText = inputText.trim();

    const tempMsg: Message = {
      id: tempId,
      text: trimmedText,
      sender: "user",
      timestamp: new Date().toISOString(),
      is_delivered: false,
      is_read: false,
    };
    dispatch(addMessage(({
      ...tempMsg,
      partnerId: partnerId,
    } as unknown) as any));

    setInputText("");

    try {
      try {
        chatServiceRef.current?.sendMessage(partnerId, trimmedText);
      } catch (wsErr) {
        console.warn("WS send failed (will persist via REST):", wsErr);
      }

      const res = await fetch(`/api/v1/session/messages/${partnerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmedText }),
      });

      if (!res.ok) throw new Error("Failed to save message");

      const saved = await res.json();

      const updatedMsg: Message = {
        id: saved.id,
        text: saved.content,
        sender: "user",
        timestamp: saved.created_at,
        is_delivered: !!saved.is_delivered,
        is_read: !!saved.is_read,
      };

      dispatch(addMessage(({
        ...updatedMsg,
        partnerId: partnerId,
      } as unknown) as any));
    } catch (err) {
      console.error("Failed to send message:", err);
      dispatch(setError("Message failed to send"));
    }
  };

  const handleRequestAI = (messageId: string) => {
    if (!chatServiceRef.current) return;
    chatServiceRef.current.requestAISuggestions(messageId, "flirty");
  };

  const handleSendAISuggestion = async (content: string, originalMessageId: string) => {
    if (!partnerId || !user?.id) return;

    const tempId = `temp-ai-${Date.now()}`;

    const tempMsg: Message = {
      id: tempId,
      text: content,
      sender: "user",
      timestamp: new Date().toISOString(),
      is_delivered: false,
      is_read: false,
    };
    dispatch(addMessage(({
      ...tempMsg,
      partnerId,
    } as unknown) as any));

    try {
      chatServiceRef.current?.sendSelectedAIReply(partnerId, content);
      dispatch(addAISuggestions({ original_message_id: originalMessageId, replies: [] } as any));
    } catch (err) {
      console.error("Failed to send AI reply:", err);
      dispatch(setError("Failed to send AI reply"));
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "…" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Find the last "other" message for AI button placement
  const lastOtherMessage = [...currentMessages].reverse().find(msg => msg.sender === "other");

  // Check if any AI suggestions are active
  const hasActiveSuggestions = Object.values(chatState.aiSuggestions).some(
    (suggestion) => suggestion.replies.length > 0
  );

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  console.log("🔍 Current filter debug:", {
    partnerId,
    totalMessages: chatState.messages.length,
    filteredMessages: currentMessages.length,
    sampleMessage: chatState.messages[0]
  });

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <CosmicBackground />

      {/* Header with Avatar */}
      <div className="z-10 glass-card border-b border-white/10 px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {/* Partner Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg">
            {partnerInfo?.profile_picture ? (
              <img 
                src={partnerInfo.profile_picture} 
                alt={partnerInfo.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm">{getInitials(partnerInfo?.name)}</span>
            )}
          </div>
          
          <div>
            <h2 className="font-semibold text-lg">{partnerInfo?.name || "Chat"}</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${chatState.connected ? "bg-green-500" : "bg-red-500"}`} />
              <p className="text-xs text-muted-foreground">
                {chatState.connected ? "Online" : "Connecting..."}
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/discovery")}>
          Back
        </Button>
      </div>

      {/* Chat Messages Container */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{
          paddingBottom: hasActiveSuggestions ? "280px" : "140px",
          scrollbarWidth: "thin",
        }}
      >
        {currentMessages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-muted-foreground italic">No messages yet. Say hi! 👋</p>
          </div>
        )}

        {currentMessages.map((msg, index) => {
          const isUser = msg.sender === "user";

          return (
            <div key={msg.id}>
              <div className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}>
                {/* Avatar for other person */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0 mb-1">
                    {partnerInfo?.profile_picture ? (
                      <img 
                        src={partnerInfo.profile_picture} 
                        alt={partnerInfo.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs">{getInitials(partnerInfo?.name)}</span>
                    )}
                  </div>
                )}

                <div className={`relative max-w-[70%]`}>
                  <div
                    className={`
                      px-4 py-2 rounded-2xl shadow-sm whitespace-pre-wrap break-words
                      ${isUser
                        ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white rounded-br-sm"
                        : "bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-bl-sm"}
                    `}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>

                    <div className="flex justify-between items-center gap-2 mt-1 text-[10px] opacity-60">
                      <span>{formatTime(msg.timestamp)}</span>
                      {isUser && <span>{msg.is_read ? "✓✓" : msg.is_delivered ? "✓" : "⏳"}</span>}
                    </div>
                  </div>
                </div>

                {/* Avatar placeholder for user (for alignment) */}
                {isUser && <div className="w-8 h-8 flex-shrink-0" />}
              </div>

              {/* AI Reply Button - Only on the LAST other message */}
              {msg.id === lastOtherMessage?.id && !chatState.aiSuggestions[msg.id] && (
                <div className="flex justify-start mt-1 ml-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRequestAI(msg.id)}
                    className="text-xs h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Reply
                  </Button>
                </div>
              )}

              {/* AI Suggestions */}
              {chatState.aiSuggestions[msg.id]?.replies.length > 0 && (
                <div className="mt-2 space-y-2 ml-10 max-w-[70%]">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-purple-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Suggestions
                    </p>
                    <button
                      onClick={() =>
                        dispatch(addAISuggestions({ original_message_id: msg.id, replies: [] } as any))
                      }
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {chatState.aiSuggestions[msg.id].replies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendAISuggestion(reply, msg.id)}
                      className="w-full text-left px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl text-sm border border-purple-400/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="z-20 glass-card border-t border-white/20 backdrop-blur-xl p-4 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 items-end max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="w-full pr-10 py-5 rounded-full bg-white/10 border-white/20 focus:border-primary/50 focus:ring-primary/30 text-sm placeholder:text-muted-foreground/60"
              disabled={!chatState.connected}
              maxLength={500}
            />
            {inputText.length > 0 && (
              <span className="absolute right-3 bottom-3 text-xs text-muted-foreground/50">
                {inputText.length}/500
              </span>
            )}
          </div>
          <Button
            type="submit"
            disabled={!chatState.connected || !inputText.trim()}
            size="lg"
            className="rounded-full h-12 w-12 p-0 bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-50 shadow-lg"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>

        {!chatState.connected && (
          <p className="text-center text-xs text-yellow-400 mt-2 animate-pulse">Reconnecting...</p>
        )}
      </div>
    </div>
  );
};

export default Chat;