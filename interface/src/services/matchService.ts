// src/services/matchService.ts


import api from "./api";
import { Match } from "@/types/types";

export const getRecommendations = async () => {
  const res = await api.get("/matches/recommendations?max_distance_km=50&min_age=18&max_age=100&limit=20");
  return res.data;
};

export const getProximityMatches = async () => {
  const res = await api.get("/matches/recommendations/proximity?radius_km=100000&limit=20");
  return res.data;
};

export const getCompatibilityMatches = async () => {
  const res = await api.get("/matches/recommendations/compatibility?limit=20");
  return res.data;
};

// src/services/matchService.ts

export const getAgeFilteredMatches = async (minAge: number, maxAge: number) => {
  const res = await api.get(
    `/matches/recommendations/age-filtered?limit=20&min_age=${minAge}&max_age=${maxAge}`
  );
  return res.data;
};


export const getFreshRecommendations = async () => {
  const res = await api.get("/matches/recommendations/fresh?limit=20");
  return res.data;
};





export const getMatches = async (): Promise<Match[]> => {
  const response = await api.get('/session/matches');
  return response.data;
};

// Fetch messages for a particular partner
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
}

export const getMessages = async (partnerId: string, limit = 50, offset = 0): Promise<Message[]> => {
  const response = await api.get(`/session/messages/${partnerId}?limit=${limit}&offset=${offset}`);
  return response.data;
};
