// src/redux/slices/callSlice.ts


import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CallStatus = "idle" | "incoming" | "outgoing" | "active" | "ended";

export type MediaType = "audio" | "video";

export interface CallState {
  status: CallStatus;
  callId: string | null;
  peerUserId: string | null;
  mediaType: MediaType | null;
  contextId?: string | null;
  isCaller: boolean;
  error: string | null;
}

const initialState: CallState = {
  status: "idle",
  callId: null,
  peerUserId: null,
  mediaType: null,
  contextId: null,
  isCaller: false,
  error: null,
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    incomingCall(
      state,
      action: PayloadAction<{
        callId: string;
        fromUserId: string;
        mediaType: MediaType;
        contextId?: string | null;
      }>
    ) {
      state.status = "incoming";
      state.callId = action.payload.callId;
      state.peerUserId = action.payload.fromUserId;
      state.mediaType = action.payload.mediaType;
      state.contextId = action.payload.contextId ?? null;
      state.isCaller = false;
      state.error = null;
    },

    outgoingCall(
      state,
      action: PayloadAction<{
        callId: string;
        toUserId: string;
        mediaType: MediaType;
      }>
    ) {
      state.status = "outgoing";
      state.callId = action.payload.callId;
      state.peerUserId = action.payload.toUserId;
      state.mediaType = action.payload.mediaType;
      state.contextId = null;
      state.isCaller = true;
      state.error = null;
    },

    callActive(
      state,
      action: PayloadAction<{ callId: string; mediaType: MediaType }>
    ) {
      state.status = "active";
      state.callId = action.payload.callId;
      state.mediaType = action.payload.mediaType;
      state.error = null;
    },

    callEnded(
      state,
      action: PayloadAction<{
        callId: string;
        reason?: string;
      }>
    ) {
      if (state.callId !== action.payload.callId) return;
      state.status = "ended";
      state.error = action.payload.reason ?? null;
    },

    callReset(state) {
      state.status = "idle";
      state.callId = null;
      state.peerUserId = null;
      state.mediaType = null;
      state.contextId = null;
      state.isCaller = false;
      state.error = null;
    },

    callError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
  },
});

export const {
  incomingCall,
  outgoingCall,
  callActive,
  callEnded,
  callReset,
  callError,
} = callSlice.actions;

export default callSlice.reducer;