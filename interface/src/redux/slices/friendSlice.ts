// src/redux/slices/friendSlice


import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getMatches} from "@/services/matchService";
import { Match } from "@/types/types";

interface MatchedState {
  matches: Match[];
  loading: boolean;
  error: string | null;
}

const initialState: MatchedState = {
  matches: [],
  loading: false,
  error: null,
};

// Async thunk to fetch matches
export const fetchMatches = createAsyncThunk(
  "matches/fetchMatches",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getMatches();
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch matches");
    }
  }
);

const friendSlice = createSlice({
  name: "matches",
  initialState,
  reducers: {
    clearMatches(state) {
      state.matches = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMatches.fulfilled, (state, action: PayloadAction<Match[]>) => {
        state.loading = false;
        state.matches = action.payload;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearMatches } = friendSlice.actions;
export default friendSlice.reducer;