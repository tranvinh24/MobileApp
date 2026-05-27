import api from './client';

export const sendSos = (elderlyId, latitude, longitude) =>
  api.post('/alerts/sos', { elderlyId, latitude, longitude });
export const getByCaregiver = (caregiverId, limit = 50) =>
  api.get(`/alerts/caregiver/${caregiverId}?limit=${limit}`);
export const getUnreadCount = (caregiverId) =>
  api.get(`/alerts/caregiver/${caregiverId}/unread-count`);
export const markAsRead = (id) => api.put(`/alerts/${id}/read`);
