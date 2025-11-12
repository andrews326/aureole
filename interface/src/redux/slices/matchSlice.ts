// src/redux/slices/matchSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getRecommendations,
  getProximityMatches,
  getCompatibilityMatches,
  getAgeFilteredMatches,
  getFreshRecommendations,
} from "@/services/matchService";

export const fetchMatches = createAsyncThunk(
  "matches/fetchAll",
  async ({ minAge = 18, maxAge = 100 }: { minAge?: number; maxAge?: number }) => {
    const [nearby, soulmates, ageFiltered, premium, fresh] = await Promise.all([
      getRecommendations(),
      getCompatibilityMatches(),
      getAgeFilteredMatches(minAge, maxAge), // ✅ now recognized
      getProximityMatches(),
      getFreshRecommendations(),
    ]);
    return { nearby, soulmates, ageFiltered, premium, fresh };
  }
);


const matchSlice = createSlice({
  name: "matches",
  initialState: {
    loading: false,
    error: null,
    profiles: { nearby: [], soulmates: [], ageFiltered: [], premium: [], fresh: [] },
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatches.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.loading = false;
        state.profiles = action.payload;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load matches";
      });
  },
});

export default matchSlice.reducer;