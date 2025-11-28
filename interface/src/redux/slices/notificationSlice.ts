// src/redux/slices/notificationSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UINotification {
  id: string;
  type: string;

  title: string;
  message: string;
  timestamp: string;
  read: boolean;

  actor_id?: string;
  actor_name?: string;
  target_id?: string;
  conversation_id?: string;
  message_preview?: string;
  payload?: any;

  requestType?: "match_request";
}

interface NotificationState {
  list: UINotification[];
  unread: number;
}

const initialState: NotificationState = {
  list: [],
  unread: 0,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {

    notificationReceived: (state, action: PayloadAction<any>) => {
      const data = action.payload;

      const backendType = data.type;

      // ---------------------------------------------------
      // NORMALIZE TYPES
      // ---------------------------------------------------
      let uiType = backendType;
      let requestType: "match_request" | undefined = undefined;

      // swipe_like => match request
      if (backendType === "swipe_like") {
        uiType = "match_request";
        requestType = "match_request";
      }

      // match => keep as match  
      // message => keep as message  
      // system => keep as system  

      // ---------------------------------------------------
      // TITLE + MESSAGE (use backend values directly)
      // ---------------------------------------------------

      const actor = data.actor_name || "Someone";

      let title = data.title;
      let message = data.message_preview || "";

      if (!title) {
        if (uiType === "match_request") {
          title = `${actor} liked you`;
        } else if (uiType === "match") {
          title = `You matched with ${actor}`;
        } else if (uiType === "message") {
          title = `${actor} sent a message`;
        } else {
          title = uiType;
        }
      }

      // Final UI notification object
      const uiNotif: UINotification = {
        id: data.id,
        type: uiType,
        title,
        message,
        timestamp: data.timestamp,
        read: false,

        actor_id: data.actor_id,
        actor_name: data.actor_name,
        target_id: data.target_id,
        conversation_id: data.conversation_id,
        message_preview: data.message_preview,
        payload: data.payload,

        requestType,
      };

      state.list.unshift(uiNotif);
      state.unread += 1;
    },

    markAllRead: (state) => {
      state.list = state.list.map((n) => ({ ...n, read: true }));
      state.unread = 0;
    },

    markRead: (state, action: PayloadAction<string>) => {
      const item = state.list.find((n) => n.id === action.payload);
      if (item && !item.read) {
        item.read = true;
        state.unread -= 1;
      }
    },

    clearNotifications: (state) => {
      state.list = [];
      state.unread = 0;
    },

    deleteNotification: (state, action: PayloadAction<string>) => {
      const idx = state.list.findIndex((n) => n.id === action.payload);
      if (idx !== -1) {
        const wasUnread = !state.list[idx].read;
        state.list.splice(idx, 1);
        if (wasUnread) state.unread -= 1;
      }
    },
  },
});

export const {
  notificationReceived,
  markAllRead,
  markRead,
  clearNotifications,
  deleteNotification,
} = notificationSlice.actions;

export default notificationSlice.reducer;