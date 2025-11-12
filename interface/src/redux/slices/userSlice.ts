import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getProfile,
  updateProfile,
  uploadMedia,
  deleteMedia,
  getStats,
  generateAura,
  UserProfile,
  Media,
} from "@/services/userSevice";

interface UserState {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
  }
  
  const initialState: UserState = {
    user: null,
    loading: false,
    error: null,
  };
  
  // --- Async Thunks ---
  
  export const fetchUser = createAsyncThunk("user/fetchUser", async () => {
    return await getProfile();
  });
  
  export const editUser = createAsyncThunk(
    "user/editUser",
    async (payload: Partial<UserProfile>) => {
      await updateProfile(payload);
      return await getProfile();
    }
  );
  
  export const uploadUserMedia = createAsyncThunk(
    "user/uploadUserMedia",
    async (file: File, { rejectWithValue }) => {
      try {
        const res = await uploadMedia(file);
        return res; // ✅ must return res.data from service
      } catch (err: any) {
        console.error("Thunk upload error:", err);
        return rejectWithValue(err.response?.data || err.message);
      }
    }
  );
  
  
  export const removeUserMedia = createAsyncThunk("user/removeUserMedia", async (id: string) => {
    await deleteMedia(id);
    return id;
  });
  
  export const refreshUserStats = createAsyncThunk("user/refreshUserStats", async () => {
    return await getStats();
  });
  
  export const activateUserAura = createAsyncThunk("user/activateUserAura", async () => {
    return await generateAura();
  });
  
  // --- Slice ---
  
  const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder
        // Fetch
        .addCase(fetchUser.pending, (state) => {
          state.loading = true;
        })
        .addCase(fetchUser.fulfilled, (state, action: PayloadAction<UserProfile>) => {
          state.user = action.payload;
          state.loading = false;
        })
        .addCase(fetchUser.rejected, (state, action) => {
          state.loading = false;
          state.error = action.error.message || "Failed to fetch user";
        })
        // Upload
        .addCase(uploadUserMedia.fulfilled, (state, action) => {
            if (state.user) {
              state.user.media = [action.payload, ...(state.user.media || [])];
            }
          })          
        // Delete
        .addCase(removeUserMedia.fulfilled, (state, action: PayloadAction<string>) => {
          if (state.user) {
            state.user.media = state.user.media.filter((m) => m.id !== action.payload);
          }
        })
        // Aura
        .addCase(activateUserAura.fulfilled, (state, action: PayloadAction<{ ai_summary: string }>) => {
          if (state.user) {
            state.user.ai_summary = action.payload.ai_summary;
          }
        });
    },
  });
  
  export default userSlice.reducer;  