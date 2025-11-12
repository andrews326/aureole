// src/services/userService.ts


import api from "./api";

export interface Media {
  id: string;
  file_path: string;
  media_type: string;
}

export interface ProfileStats {
  views: number;
  matches: number;
  response_rate: number;
  interests: string[];
}

export interface UserProfile {
  id: string;
  full_name?: string;
  age?: number;
  gender?: string;
  bio?: string;
  ai_summary?: string;
  is_verified: boolean;
  media: Media[];
  stats?: ProfileStats;
}

// -------- API CALLS --------

export const getProfile = async () => {
    try {
      const res = await api.get("/getprofile/me");
      return res.data;
    } catch (err: any) {
      console.error("❌ Profile fetch failed:", err.response?.data || err.message);
      throw err;
    }
  };
  
export const updateProfile = async (data: Partial<UserProfile>) => {
  const res = await api.patch("/getprofile/edit", data);
  return res.data;
};

export const uploadMedia = async (file: File, media_type = "image"): Promise<Media> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("media_type", media_type);
  const res = await api.post("/getprofile/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteMedia = async (id: string) => {
  const res = await api.delete(`/getprofile/media/${id}`);
  return res.data;
};

export const getStats = async (): Promise<ProfileStats> => {
  const res = await api.get("/getprofile/stats");
  return res.data;
};

export const generateAura = async (): Promise<{ ai_summary: string }> => {
  const res = await api.post("/getprofile/aura");
  return res.data;
};