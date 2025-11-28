// src/redux/store.ts


// src/redux/store.ts

import { configureStore, combineReducers } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import profileReducer from "./slices/profileSlice";
import swipeReducer from "./slices/swipeSlice";
import matchReducer from "./slices/matchSlice";
import friendReducer from "./slices/friendSlice";
import chatReducer from "./slices/chatSlice";
import sessionReducer from "./slices/sessionSlice";
import userReducer from "./slices/userSlice";
import notificationsReducer from "./slices/notificationSlice";
import callReducer from "./slices/callSlice";


const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  swipe: swipeReducer,
  matches: matchReducer,
  friends: friendReducer,
  chat: chatReducer,
  session: sessionReducer,
  user: userReducer,
  notifications: notificationsReducer,
  call: callReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
