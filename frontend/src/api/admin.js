import api from './client';

export const getAdminUsers = () => api.get('/admin/users');
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminConfig = () => api.get('/admin/config');
export const setAdminConfig = (data) => api.put('/admin/config', data);
