// Formato de valores para la interfaz (es-MX).

const pad = (n) => String(n).padStart(2, '0');

/** 300000 → "00:05:00" */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const total = Math.round(ms / 1000);
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Etiqueta corta para la barra de tiempo: "05:00" o "1:05:00". */
export function formatTimelineLabel(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const mm = pad(Math.floor((total % 3600) / 60));
  const ss = pad(total % 60);
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Hora local "18:01:20" */
export function formatClock(date) {
  if (!(date instanceof Date)) return '—';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Fecha y hora local "2026-10-04 18:01:20" */
export function formatDateTime(date) {
  if (!(date instanceof Date)) return 'Sin fecha/hora';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatClock(date)}`;
}

export const formatCoord = (n) => (Number.isFinite(n) ? n.toFixed(6) : '—');
export const formatKm = (km) => (Number.isFinite(km) ? `${km.toFixed(2)} km` : '—');
export const formatSpeed = (kmh) => (Number.isFinite(kmh) ? `${Math.round(kmh)} km/h` : '—');
