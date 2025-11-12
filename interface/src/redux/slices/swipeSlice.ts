// src/store/swipeSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import swipeService from "@/services/swipeService";

interface SwipeState {
  loading: boolean;
  error: string | null;
  lastAction?: {
    targetId: string;
    type: "like" | "pass" | "superlike";
    isMutual?: boolean;
  };
}

const initialState: SwipeState = {
  loading: false,
  error: null,
};

// ---------------------------
//  Async Thunks
// ---------------------------

// Right or Left Swipe
export const sendSwipe = createAsyncThunk(
  "swipe/sendSwipe",
  async (
    { targetId, liked }: { targetId: string; liked: boolean },
    { rejectWithValue }
  ) => {
    try {
      const data = await swipeService.swipe(targetId, liked);
      return { targetId, liked, ...data };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Explicit Super Like
export const sendSuperLike = createAsyncThunk(
  "swipe/sendSuperLike",
  async (targetId: string, { rejectWithValue }) => {
    try {
      const data = await swipeService.like(targetId);
      return { targetId, ...data };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const swipeSlice = createSlice({
  name: "swipe",
  initialState,
  reducers: {
    resetSwipeState: (state) => {
      state.loading = false;
      state.error = null;
      state.lastAction = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendSwipe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendSwipe.fulfilled, (state, action) => {
        state.loading = false;
        state.lastAction = {
          targetId: action.payload.targetId,
          type: action.payload.liked ? "like" : "pass",
          isMutual: action.payload.is_mutual || false,
        };
      })
      .addCase(sendSwipe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(sendSuperLike.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendSuperLike.fulfilled, (state, action) => {
        state.loading = false;
        state.lastAction = {
          targetId: action.payload.targetId,
          type: "superlike",
          isMutual: action.payload.is_mutual || false,
        };
      })
      .addCase(sendSuperLike.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetSwipeState } = swipeSlice.actions;
export default swipeSlice.reducer;