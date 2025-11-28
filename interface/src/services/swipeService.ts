// src/services/swipeService.ts
import api from "./api";

// ---------------------------
//  Swipe / Like API Service
// ---------------------------

export const swipeService = {
  // Record a left or right swipe
  swipe: async (targetId: string, liked: boolean) => {
    const res = await api.post(`/interactions/swipe/${targetId}?liked=${liked}`);
    return res.data?.data;
  },

  // Explicit Like (Super Like)
  like: async (targetId: string) => {
    const res = await api.post(`/interactions/like/${targetId}`);
    return res.data?.data;
  },

  // Record a profile view
  view: async (targetId: string) => {
    const res = await api.post(`/interactions/view/${targetId}`);
    return res.data?.data;
  },

  // Undo last swipe (within time limit)
  undoSwipe: async () => {
    const res = await api.post(`/interactions/undo/swipe`);
    return res.data?.data;
  },

  // Undo a specific like
  undoLike: async (targetId: string) => {
    const res = await api.post(`/interactions/undo/like/${targetId}`);
    return res.data?.data;
  },

  // ---------------------------------------------------
  // NEW: Accept a swipe request (creates a mutual match)
  // ---------------------------------------------------
  acceptSwipe: async (swiperId: string) => {
    const res = await api.post(`/interactions/swipe/accept/${swiperId}`);
    return res.data;
  },

  // ---------------------------------------------------
  // NEW: Reject a swipe request (deletes pending swipe)
  // ---------------------------------------------------
  rejectSwipe: async (swiperId: string) => {
    const res = await api.post(`/interactions/swipe/reject/${swiperId}`);
    return res.data;
  },
};

export default swipeService;