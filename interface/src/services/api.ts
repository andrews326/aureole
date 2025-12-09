// src/services/api.ts

import * as dotenv from 'dotenv';
dotenv.config();
import axios from "axios";
import { store } from "@/redux/store";

// Read PRODUCTION_IP environment variable
const productionIp = process.env.PRODUCTION_IP;

// Define BASE URL based on environment
const API_BASE = productionIp ? `http://${productionIp}:8000/api/v1` : "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth?.token;

  // If there's a token in the state, add it to the request headers
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
