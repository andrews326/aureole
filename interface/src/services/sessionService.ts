// // src/services/sessionService.ts


import api from './api';
import { BackendMessage } from '@/types/types';

export const sessionService = {
    getConversationHistory: (partnerId: string, limit = 50, offset = 0) =>
      api.get<BackendMessage[]>(`/session/messages/${partnerId}?limit=${limit}&offset=${offset}`),
  };
  
export const insightService = {
  getEnrichedInsights: () =>
    api.get("/insights/enriched"), // returns the full enriched list
  };

export const mediaService = {
  uploadChatMedia: async (file: File) => {
    const form = new FormData();
    form.append("file", file);

    const res = await api.post("/chat/media/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },
};


export const messageActions = {
  deleteMessage: (messageId: string) =>
    api.delete(`/session/${messageId}`),

  reactMessage: (messageId: string, reaction: string) =>
    api.post(`/session/${messageId}/reactions`, { reaction }),

  removeReaction: (messageId: string) =>
    api.delete(`/session/${messageId}/reactions`),
};


// 🔹 SERVICE FUNCTION: block + unmatch a user
export const blockMatchUser = (targetUserId: string) => {
  // assuming backend router is mounted at /matches
  return api.post(`/interactions/unmatch/${targetUserId}`);
};

// Fetch list of blocked users
export const fetchBlockedUsers = () => {
  return api.get("/interactions/blocked");
};

// Unblock a specific user
export const unblockUser = (blockedUserId: string) => {
  return api.delete(`/interactions/block/${blockedUserId}`);
};
