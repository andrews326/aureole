// src/redux/slices/chatSlice.ts


import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Message, AISuggestions } from "@/types/types";

interface ChatState {
  messages: Message[];
  aiSuggestions: Record<string, AISuggestions>;
  connected: boolean;
  error: string | null;

  // internal conversation isolation (new)
  conversations?: Record<string, Message[]>;
}

const initialState: ChatState = {
  messages: [],
  aiSuggestions: {},
  connected: false,
  error: null,
  conversations: {},
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },

    addMessage(state, action: PayloadAction<Message & { partnerId?: string }>) {
      const { partnerId, ...message } = action.payload;

      // Determine partner ID dynamically if not passed
      const targetId =
        partnerId ||
        (message.sender === "user" ? "self" : "unknown_partner");

      if (!state.conversations) state.conversations = {};
      if (!state.conversations[targetId]) state.conversations[targetId] = [];

      const existing = state.conversations[targetId].find(
        m =>
          m.id === message.id ||
          (m.id.startsWith("temp-") &&
            message.id !== m.id &&
            m.text === message.text)
      );

      if (existing) {
        Object.assign(existing, message);
      } else {
        state.conversations[targetId].push(message);
      }

      // Sort per conversation
      state.conversations[targetId].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Flatten view for legacy usage (UI)
      state.messages = state.conversations[targetId];
    },

    markAsDelivered(state, action: PayloadAction<string>) {
      for (const convo of Object.values(state.conversations || {})) {
        const msg = convo.find(m => m.id === action.payload);
        if (msg) msg.is_delivered = true;
      }
    },

    markAsRead(state, action: PayloadAction<string>) {
      for (const convo of Object.values(state.conversations || {})) {
        const msg = convo.find(m => m.id === action.payload);
        if (msg) msg.is_read = true;
      }
    },

    addAISuggestions(state, action: PayloadAction<AISuggestions>) {
      state.aiSuggestions[action.payload.original_message_id] = action.payload;
    },

    clearChat(state) {
      state.messages = [];
      state.aiSuggestions = {};
      state.connected = false;
      state.error = null;
      state.conversations = {};
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
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
} = chatSlice.actions;

export default chatSlice.reducer;