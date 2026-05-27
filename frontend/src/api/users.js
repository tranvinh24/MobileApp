import api from './client';

export const getMe = () => api.get('/users/me');
export const getLinkedElderly = (caregiverId) => api.get(`/users/linked-elderly?caregiverId=${caregiverId}`);
export const getLinkedCaregivers = (elderlyId) => api.get(`/users/linked-caregivers?elderlyId=${elderlyId}`);
export const linkElderlyCaregiver = (elderlyId, caregiverId) =>
  api.post('/users/link', { elderlyId, caregiverId });
export const linkByEmail = (email) =>
  api.post('/users/link-by-email', { email });
export const linkByPhone = (phone) =>
  api.post('/users/link-by-phone', { phone });
export const unlinkElderly = (elderlyId) =>
  api.post('/users/unlink', { elderlyId });
export const getElderlyProfile = (userId) => api.get(`/users/profile/elderly/${userId}`);
export const updateElderlyProfile = (userId, data) => api.put(`/users/profile/elderly/${userId}`, data);
