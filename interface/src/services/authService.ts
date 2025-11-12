// src/services/authService.ts


import api from "./api";


export const signup = async (email: string, phone: string, password: string) => {
  const res = await api.post(`/signup`, { email, phone, password });
  return res.data; // { msg, user_id }
};

export const login = async (email: string, password: string) => {
  const res = await api.post(`/login`, { email, password });
  return res.data; // expected: { access_token, user_id, msg? }
};

export const getMyProfile = async () => {
  try {
    const res = await api.get(`/profile/me`);
    return res.data; // { exists: true|false, raw_prompts?, ai_summary?, preferences? }
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    return { exists: false };
  }
};