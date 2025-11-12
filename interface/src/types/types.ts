// src/types/types.ts



export interface Profile {
    id: string;
    name: string;
    age: number;
    bio: string;
    imageUrl: string;
    distance?: string;
    compatibility?: number;
  }

export interface Match {
  match_id: string;
  user_id: string;
  partner_id: string; 
  name: string;
  age: number;
  bio: string;
  imageUrl: string | null;
  compatibility: number;
  is_active: boolean;
  is_verified: boolean;
  mutual_interests: string[];
  common_values: string[];
  last_active_at: string;
  last_message_preview: string | null;
  conversation_starters: string[];
} 

// UI Message type (used in Redux and components)
export interface Message {
  id: string;
  text: string;
  sender: "user" | "other";
  timestamp: string;
  is_delivered: boolean;
  is_read: boolean;
}

// Backend Message type (from API)
export interface BackendMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
}

// AI Suggestions type
export interface AISuggestions {
  original_message_id: string;
  replies: string[];
  remaining_today?: number;
}

// Helper function to convert backend message to UI message
export function toUIMessage(backendMsg: BackendMessage, currentUserId: string): Message {
  return {
    id: backendMsg.id,
    text: backendMsg.content,
    sender: backendMsg.sender_id === currentUserId ? "user" : "other",
    timestamp: backendMsg.created_at,
    is_delivered: backendMsg.is_delivered,
    is_read: backendMsg.is_read,
  };
}

