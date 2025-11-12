// src/redux/store.ts


import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage backend

import authReducer from "./slices/authSlice";
import profileReducer from "./slices/profileSlice";
import swipeReducer from "./slices/swipeSlice";
import matchReducer from "./slices/matchSlice";
import friendReducer from "./slices/friendSlice";
import chatReducer from "./slices/chatSlice";
import sessionReducer from "./slices/sessionSlice";
import userReducer  from "./slices/userSlice";

// 🔧 Removed duplicate import
// import messageReducer from "./slices/sessionSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  swipe: swipeReducer,
  matches: matchReducer,
  friends: friendReducer,
  chat: chatReducer,
  session: sessionReducer,
  user: userReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "chat", "session"], // ✅ persisted slices
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;