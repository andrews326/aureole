// src/redux/slices/profileSlice.ts


import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as profileService from "@/services/profileService";

interface ProfileState {
  loading: boolean;
  error: string | null;
  summary: string | null;
  preferences: any | null;
  verification: { mediaId?: string; isVerified?: boolean } | null;
}

const initialState: ProfileState = {
  loading: false,
  error: null,
  summary: null,
  preferences: null,
  verification: null,
};

// thunks
export const uploadVerification = createAsyncThunk(
  "profile/uploadVerification",
  async (payload: { file: Blob; filename?: string }, { rejectWithValue }) => {
    try {
      const data = await profileService.uploadVerificationPhoto(payload.file, payload.filename, true);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

export const finishProfileSetup = createAsyncThunk(
  "profile/finishSetup",
  async (payload: any, { rejectWithValue }) => {
    try {
      const data = await profileService.setupProfile(payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

export const sendLocation = createAsyncThunk(
  "profile/sendLocation",
  async (
    payload: { latitude?: number; longitude?: number; share_location?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const data = await profileService.updateLocation(payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

const slice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearProfileState(state) {
      state.loading = false;
      state.error = null;
      state.summary = null;
      state.preferences = null;
      state.verification = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // uploadVerification
      .addCase(uploadVerification.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(uploadVerification.fulfilled, (s, a) => {
        s.loading = false;
        s.verification = {
          mediaId: a.payload.media_id,
          isVerified: a.payload.is_verified,
        };
      })
      .addCase(uploadVerification.rejected, (s, a) => {
        s.loading = false;
        s.error =
          typeof a.payload === "string"
            ? a.payload
            : (a.payload as any)?.detail || (a.payload as any)?.message || a.error.message || "Unknown error";
      })

      // finishProfileSetup
      .addCase(finishProfileSetup.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(finishProfileSetup.fulfilled, (s, a) => {
        s.loading = false;
        s.summary = a.payload.summary;
        s.preferences = a.payload.preferences;
      })
      .addCase(finishProfileSetup.rejected, (s, a) => {
        s.loading = false;
        s.error =
          typeof a.payload === "string"
            ? a.payload
            : (a.payload as any)?.detail || (a.payload as any)?.message || a.error.message || "Unknown error";
      })

      // sendLocation
      .addCase(sendLocation.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(sendLocation.fulfilled, (s) => {
        s.loading = false;
      })
      .addCase(sendLocation.rejected, (s, a) => {
        s.loading = false;
        s.error =
          typeof a.payload === "string"
            ? a.payload
            : (a.payload as any)?.detail || (a.payload as any)?.message || a.error.message || "Unknown error";
      });
  },
});

export const { clearProfileState } = slice.actions;
export default slice.reducer;