// src/services/profileService.ts


import { api } from "./api";

export const uploadVerificationPhoto = async (file: Blob, filename = "selfie.jpg", isVerification = true) => {
  const fd = new FormData();
  fd.append("file", file, filename);
  fd.append("is_verification", String(isVerification));

  const res = await api.post("/profile/verify-photo", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { msg, media_id, is_verified, media_type }
};

export const setupProfile = async (payload: any) => {
  // payload should match ProfileSetupRequest schema
  const res = await api.post("/profile/setup", payload);
  return res.data; // { msg, summary, preferences }
};

export const updateLocation = async (payload: { latitude?: number; longitude?: number; share_location?: boolean }) => {
  const res = await api.post("/profile/location", payload);
  return res.data;
};