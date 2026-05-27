import api from './client';

export const create = (elderlyId, type, notes, latitude, longitude) =>
  api.post('/check-ins', { elderlyId, type, notes, latitude, longitude });
export const getByElderly = (elderlyId, limit = 30) =>
  api.get(`/check-ins/elderly/${elderlyId}?limit=${limit}`);
