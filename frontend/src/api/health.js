import api from './client';

export const getHealthEntries = (elderlyId, from = null, to = null, limit = 100) => {
  const params = { limit };
  if (from) params.from = from;
  if (to) params.to = to;
  return api.get(`/health/elderly/${elderlyId}/entries`, { params });
};

export const createHealthEntry = (elderlyId, data) =>
  api.post(`/health/elderly/${elderlyId}/entries`, data);

export const updateHealthEntry = (id, data) =>
  api.put(`/health/entries/${id}`, data);

export const deleteHealthEntry = (id) =>
  api.delete(`/health/entries/${id}`);

