// src/redux/slices/authSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  email?: string;
  verified?: boolean;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const DEFAULT_AVATAR = "/images/default-avatar.png";

// Load from localStorage & normalize avatar
const activeUserId = localStorage.getItem("active_user_id");
const savedAuth = activeUserId ? localStorage.getItem(`auth_${activeUserId}`) : null;

const parsed = savedAuth ? JSON.parse(savedAuth) : null;

const initialState: AuthState = {
  token: parsed?.token || null,
  user: parsed?.user
    ? {
        ...parsed.user,
        avatar: parsed.user.avatar || DEFAULT_AVATAR,
      }
    : null,
  isAuthenticated: !!parsed?.token && !!parsed?.user?.id,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      const token = action.payload.token;
      const user = {
        ...action.payload.user,
        avatar: action.payload.user.avatar || DEFAULT_AVATAR,
      };
      console.log("SET AUTH CALLED WITH:", action.payload);

    
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
    
      // Persist per-user
      localStorage.setItem(`auth_${user.id}`, JSON.stringify({ token, user }));
      localStorage.setItem("active_user_id", user.id);
    },
    
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (!state.user) return;
    
      state.user = {
        ...state.user,
        ...action.payload,
        avatar: action.payload.avatar || state.user.avatar || DEFAULT_AVATAR,
      };
    
      // Save under the correct user key
      localStorage.setItem(
        `auth_${state.user.id}`,
        JSON.stringify({ token: state.token, user: state.user })
      );
    },

    clearAuth: (state) => {
      if (state.user?.id) {
        localStorage.removeItem(`auth_${state.user.id}`);
      }
      localStorage.removeItem("active_user_id");
    
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setAuth, clearAuth, updateUser } = authSlice.actions;
export default authSlice.reducer;