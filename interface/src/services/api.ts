// src/services/api.ts


import axios from "axios";
import { store } from "@/redux/store";

const API_BASE = "http://13.50.111.194:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth?.token;

  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;