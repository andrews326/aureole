// src/redux/slices/sessionSlice.ts


import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Message, BackendMessage, toUIMessage } from "@/types/types";
import { sessionService } from "@/services/sessionService";
import { RootState } from "../store";

interface SessionState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: SessionState = {
  messages: [],
  loading: false,
  error: null,
  hasMore: true,
};

export const fetchConversation = createAsyncThunk<
  Message[],
  { partnerId: string; limit?: number; offset?: number },
  { state: RootState; rejectValue: string }
>(
  "session/fetchConversation",
  async ({ partnerId, limit = 50, offset = 0 }, { getState, rejectWithValue }) => {
    try {
      const res = await sessionService.getConversationHistory(partnerId, limit, offset);
      const data = res.data; // ✅ backend returns an array
      const { auth } = getState();
      const currentUserId = auth.user?.id;

      if (!Array.isArray(data) || !currentUserId) {
        return rejectWithValue("Invalid data or user not loaded");
      }

      const mapped: Message[] = data.map((msg: BackendMessage) =>
        toUIMessage(msg, currentUserId)
      );

      return mapped;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load conversation");
    }
  }
);

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    clearSession(state) {
      state.messages = [];
      state.error = null;
      state.hasMore = true;
      state.loading = false;
    },
    prependMessages(state, action: PayloadAction<Message[]>) {
      state.messages = [...action.payload, ...state.messages];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
        state.hasMore = action.payload.length > 0;
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load messages";
      });
  },
});

export const { clearSession, prependMessages } = sessionSlice.actions;
export default sessionSlice.reducer;
