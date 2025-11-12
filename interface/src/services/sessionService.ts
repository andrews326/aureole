// // src/services/sessionService.ts


import api from './api';
import { BackendMessage } from '@/types/types';

export const sessionService = {
    getConversationHistory: (partnerId: string, limit = 50, offset = 0) =>
      api.get<BackendMessage[]>(`/session/messages/${partnerId}?limit=${limit}&offset=${offset}`),
  };
  
