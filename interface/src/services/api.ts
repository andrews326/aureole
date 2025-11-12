// src/services/api.ts


import axios, { InternalAxiosRequestConfig } from "axios";

const API_BASE = "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const raw = localStorage.getItem("auth");
    if (raw) {
      const { token } = JSON.parse(raw);
      if (token) {
        // Safely set Authorization header
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } catch {
    // ignore malformed localStorage data
  }
  return config;
});

export default api;
