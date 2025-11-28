// // src/redux/slices/chatSlice.ts


// import { createSlice, PayloadAction } from "@reduxjs/toolkit";
// import { Message, AISuggestions } from "@/types/types";

// interface ChatState {
//   messages: Message[];
//   aiSuggestions: Record<string, AISuggestions>;
//   connected: boolean;
//   error: string | null;

//   // internal conversation isolation (new)
//   conversations?: Record<string, Message[]>;
// }

// const initialState: ChatState = {
//   messages: [],
//   aiSuggestions: {},
//   connected: false,
//   error: null,
//   conversations: {},
// };

// export const chatSlice = createSlice({
//   name: "chat",
//   initialState,
//   reducers: {
//     setConnected(state, action: PayloadAction<boolean>) {
//       state.connected = action.payload;
//     },

//     addMessage(state, action: PayloadAction<Message & { partnerId?: string }>) {
//       const { partnerId, ...message } = action.payload;

//       // Determine partner ID dynamically if not passed
//       const targetId =
//         partnerId ||
//         (message.sender === "user" ? "self" : "unknown_partner");

//       if (!state.conversations) state.conversations = {};
//       if (!state.conversations[targetId]) state.conversations[targetId] = [];

//       const existing = state.conversations[targetId].find(
//         m =>
//           m.id === message.id ||
//           (m.id.startsWith("temp-") &&
//             message.id !== m.id &&
//             m.text === message.text)
//       );

//       if (existing) {
//         Object.assign(existing, message);
//       } else {
//         state.conversations[targetId].push(message);
//       }

//       // Sort per conversation
//       state.conversations[targetId].sort(
//         (a, b) =>
//           new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
//       );

//       // Flatten view for legacy usage (UI)
//       state.messages = state.conversations[targetId];
//     },

//     markAsDelivered(state, action: PayloadAction<string>) {
//       for (const convo of Object.values(state.conversations || {})) {
//         const msg = convo.find(m => m.id === action.payload);
//         if (msg) msg.is_delivered = true;
//       }
//     },

//     markAsRead(state, action: PayloadAction<string>) {
//       for (const convo of Object.values(state.conversations || {})) {
//         const msg = convo.find(m => m.id === action.payload);
//         if (msg) msg.is_read = true;
//       }
//     },

//     addAISuggestions(state, action: PayloadAction<AISuggestions>) {
//       state.aiSuggestions[action.payload.original_message_id] = action.payload;
//     },

//     clearChat(state) {
//       state.messages = [];
//       state.aiSuggestions = {};
//       state.connected = false;
//       state.error = null;
//       state.conversations = {};
//     },

//     setError(state, action: PayloadAction<string | null>) {
//       state.error = action.payload;
//     },
//   },
// });

// export const {
//   setConnected,
//   addMessage,
//   markAsDelivered,
//   markAsRead,
//   addAISuggestions,
//   clearChat,
//   setError,
// } = chatSlice.actions;

// export default chatSlice.reducer;


  // src/redux/slices/chatSlice.ts

  import { createSlice, PayloadAction } from "@reduxjs/toolkit";
  import type { RootState } from "@/redux/store";

  export interface UIMessage {
    id: string;
    text: string;
    sender: "user" | "other";
    timestamp: string;
    is_delivered: boolean;
    is_read: boolean;

    sender_id?: string;
    receiver_id?: string;

    // 🔥 NEW fields for media messages
    message_type?: "text" | "image" | "video" | "audio" | "file";
    media_id?: string | null;
    media_url?: string | null;
    thumb_url?: string | null;

    reactions?: Record<string, string>;
  }


  export interface AISuggestions {
    original_message_id: string;
    replies: string[];
    remaining_today?: number;
  }

  interface ChatState {
    conversations: Record<string, UIMessage[]>;
    aiSuggestions: Record<string, AISuggestions>;
    connected: boolean;
    error: string | null;
  }

  const initialState: ChatState = {
    conversations: {},
    aiSuggestions: {},
    connected: false,
    error: null,
  };

  type AddMessagePayload = UIMessage & {
    partnerId?: string;
    myUserId: string;     // 🔥 REQUIRED FIX
  };

  export const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
      setConnected(state, action: PayloadAction<boolean>) {
        state.connected = action.payload;
      },

      addMessage(state, action: PayloadAction<AddMessagePayload>) {
        const p = action.payload;

        // 1️⃣ ALWAYS determine partner using universal rule
        let partnerId = p.partnerId;

        if (!partnerId) {
          const me = p.myUserId;
          const s = p.sender_id;
          const r = p.receiver_id;

          // pick id that isn't yours
          partnerId = s === me ? r : s;
        }

        // 2️⃣ If still invalid → drop
        if (!partnerId) {
          console.warn("Dropped message — can't determine partner:", p);
          return;
        }

        if (!state.conversations[partnerId]) {
          state.conversations[partnerId] = [];
        }

        const convo = state.conversations[partnerId];

        // 3️⃣ Replace temp message if matching text & same sender
        const idx = convo.findIndex(
          (m) =>
            m.id === p.id ||
            (m.id.startsWith("temp-") &&
              p.id !== m.id &&
              m.text === p.text &&
              m.sender === p.sender)
        );

        const stored: UIMessage = {
          id: p.id,
          text: p.text || "",
          sender: p.sender,
          timestamp: p.timestamp,
          is_delivered: !!p.is_delivered,
          is_read: !!p.is_read,
        
          message_type: p.message_type,
          media_id: p.media_id,
          media_url: p.media_url,
          thumb_url: p.thumb_url,
        
          sender_id: p.sender_id,
          receiver_id: p.receiver_id,

          reactions: p.reactions ?? {},
        };
        
        

        if (idx !== -1) {
          convo[idx] = { ...convo[idx], ...stored };
        } else {
          convo.push(stored);
        }

        // 4️⃣ Keep ordering stable
        convo.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      },

      markAsDelivered(state, action: PayloadAction<string>) {
        const id = action.payload;
        for (const convo of Object.values(state.conversations)) {
          const m = convo.find((x) => x.id === id);
          if (m) m.is_delivered = true;
        }
      },

      markAsRead(state, action: PayloadAction<string>) {
        const id = action.payload;
        for (const convo of Object.values(state.conversations)) {
          const m = convo.find((x) => x.id === id);
          if (m) m.is_read = true;
        }
      },

      addAISuggestions(state, action: PayloadAction<AISuggestions>) {
        state.aiSuggestions[action.payload.original_message_id] =
          action.payload;
      },

      // NEW: clear only one partner's conversation
      clearConversation(state, action: PayloadAction<string>) {
        const pid = action.payload;
        if (state.conversations[pid]) {
          delete state.conversations[pid];
        }
        // Keep aiSuggestions intact (they will be ignored if messages not present)
      },

      clearChat(state) {
        state.conversations = {};
        state.aiSuggestions = {};
        state.connected = false;
        state.error = null;
      },

      setError(state, action: PayloadAction<string | null>) {
        state.error = action.payload;
      },

      updateReaction(state, action: PayloadAction<{
        messageId: string;
        userId: string;
        reaction: string;
      }>) {
        const { messageId, userId, reaction } = action.payload;
      
        for (const convo of Object.values(state.conversations)) {
          const msg = convo.find(m => m.id === messageId);
          if (msg) {
            if (!msg.reactions) msg.reactions = {};
            msg.reactions[userId] = reaction;
          }
        }
      },
      
      removeReaction(state, action: PayloadAction<{
        messageId: string;
        userId: string;
      }>) {
        const { messageId, userId } = action.payload;
      
        for (const convo of Object.values(state.conversations)) {
          const msg = convo.find(m => m.id === messageId);
          if (msg?.reactions) {
            delete msg.reactions[userId];
          }
        }
      },
      
    },
  });

  export const {
    setConnected,
    addMessage,
    markAsDelivered,
    markAsRead,
    addAISuggestions,
    clearChat,
    setError,
    clearConversation,
    updateReaction,
    removeReaction,
  } = chatSlice.actions;

  export default chatSlice.reducer;

  export const selectConversation = (state: RootState, partnerId: string | null) =>
    partnerId ? state.chat.conversations[partnerId] || [] : [];