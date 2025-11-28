// src/services/callServiceInstance.ts
import { PersistentCallService } from "./callService";
import { store } from "@/redux/store";

let instance: PersistentCallService | null = null;

export function getCallService(
  userId?: string,
  token?: string
) {
  // If not provided, pull from Redux store
  if (!userId || !token) {
    const state = store.getState();
    userId = userId ?? state.auth?.user?.id;
    token = token ?? state.auth?.token;
  }

  if (!userId || !token) return null;

  // FIRST TIME
  if (!instance) {
    instance = new PersistentCallService(userId, token);
    return instance;
  }

  // USER CHANGED → reset instance
  if (instance.getUserId() !== userId) {
    instance.disconnect();
    instance = new PersistentCallService(userId, token);
    return instance;
  }

  // SAME USER → UPDATE TOKEN
  instance.setToken(token);

  return instance;
}
