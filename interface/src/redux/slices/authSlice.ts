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

// Load from localStorage
const savedAuth = localStorage.getItem("auth");
const parsed = savedAuth ? JSON.parse(savedAuth) : null;

const initialState: AuthState = {
  token: parsed?.token || null,
  user: parsed?.user || null,
  isAuthenticated: !!parsed?.token && !!parsed?.user?.id,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem(
        "auth",
        JSON.stringify({ token: state.token, user: state.user })
      );
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("auth");
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;