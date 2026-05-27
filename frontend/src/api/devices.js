import api from './client';

export const registerDevice = (data) => api.post('/devices/register', data);

export const listMyDevices = () => api.get('/devices/me');

export const revokeMyDevice = (id) => api.delete(`/devices/${id}`);

