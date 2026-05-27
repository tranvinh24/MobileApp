import api from './client';

export const getById = (id) => api.get(`/prescriptions/${id}`);
export const getByElderly = (elderlyId) => api.get(`/prescriptions/elderly/${elderlyId}`);
export const create = (prescription, createdBy) =>
  api.post(`/prescriptions?createdBy=${createdBy}`, prescription);
export const update = (id, data) => api.put(`/prescriptions/${id}`, data);
export const remove = (id) => api.delete(`/prescriptions/${id}`);
export const addMedication = (prescriptionId, medication) =>
  api.post(`/prescriptions/${prescriptionId}/medications`, medication);
export const addSchedule = (medicationId, timeOfDay, reminderMinutesBefore = 15) =>
  api.post(`/prescriptions/medications/${medicationId}/schedules`, {
    timeOfDay,
    reminderMinutesBefore,
  });

export const updateMedication = (medicationId, data) =>
  api.put(`/prescriptions/medications/${medicationId}`, data);

export const deleteMedication = (medicationId) =>
  api.delete(`/prescriptions/medications/${medicationId}`);

export const updateSchedule = (scheduleId, data) =>
  api.put(`/prescriptions/schedules/${scheduleId}`, data);

export const deleteSchedule = (scheduleId) =>
  api.delete(`/prescriptions/schedules/${scheduleId}`);
