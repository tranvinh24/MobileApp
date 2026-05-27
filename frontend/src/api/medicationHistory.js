import api from './client';

export const confirmTaken = (scheduleId, scheduledTime) =>
  api.post('/medication-history/confirm', {
    scheduleId,
    scheduledTime: typeof scheduledTime === 'string' ? scheduledTime : scheduledTime?.toISOString?.(),
  });

export const skip = (scheduleId, scheduledTime, notes = null) =>
  api.post('/medication-history/skip', {
    scheduleId,
    scheduledTime: typeof scheduledTime === 'string' ? scheduledTime : scheduledTime?.toISOString?.(),
    notes,
  });

function toISOLocal(d) {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
}

export const getByElderly = (elderlyId, start, end) =>
  api.get(`/medication-history/elderly/${elderlyId}`, {
    params: { start: toISOLocal(start), end: toISOLocal(end) },
  });
