// Clasificación de velocidad para colorear la trayectoria (ejercicio D.2).
export const SPEED_BANDS = [
  { max: 30, color: '#16a34a', label: '< 30 km/h' },
  { max: 60, color: '#eab308', label: '30–60 km/h' },
  { max: Infinity, color: '#dc2626', label: '≥ 60 km/h' },
];
export const UNKNOWN_SPEED_COLOR = '#94a3b8';

export function speedColor(kmh) {
  if (!Number.isFinite(kmh)) return UNKNOWN_SPEED_COLOR;
  return SPEED_BANDS.find((b) => kmh < b.max).color;
}

/** Velocidad representativa de un segmento: promedio de los extremos conocidos. */
export function segmentSpeed(a, b) {
  const v = [a.speedKmh, b.speedKmh].filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
