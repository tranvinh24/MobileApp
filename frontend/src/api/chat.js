import api, { API_URL } from './client';

export const WS_URL = API_URL
  .replace(/^https:/, 'wss:')
  .replace(/^http:/, 'ws:')
  .replace(/\/api\/?$/, '') + '/ws';

export const getConversations = () => api.get('/chat/conversations');

export const getMessages = (conversationId, limit = 30) =>
  api.get(`/chat/conversations/${conversationId}/messages`, { params: { limit } });

export const sendText = (conversationId, text) =>
  api.post(`/chat/conversations/${conversationId}/messages`, { text });

export const sendImage = (conversationId, formData) =>
  api.post(`/chat/conversations/${conversationId}/messages/image`, formData);

export const analyzeMealMessage = (conversationId, messageId) =>
  api.post(`/chat/conversations/${conversationId}/messages/${messageId}/meal-analysis`);

