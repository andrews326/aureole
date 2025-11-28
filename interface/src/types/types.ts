// src/types/types.ts



export interface Profile {
    id: string;
    name: string;
    age: number;
    bio: string;
    distance?: string;
    compatibility?: number;
    photos: string[]; 
  }

// src/types/types.ts
export interface Match {
  // server returns these exact fields
  user_id: string;
  full_name: string;
  age: number | null;
  avatar: string | null;
  mini_traits: string[];          // small list of trait keywords
  ai_summary: string;             // 2-3 line AI summary
  compatibility_reason: string;   // cached text (may be empty)
  last_message_preview: string | null;
  conversation_starter: string;   // cached starter or "" (last message override happens server-side)
  last_active: string | null;     // ISO timestamp or null
  is_online: boolean;
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

