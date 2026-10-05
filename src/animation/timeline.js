// Línea de tiempo de reproducción: cálculo puro, sin DOM. Se puede probar en Node.js.
import { bearingDeg, interpolate } from '../utils/haversine.js';

export const UNIFORM_INTERVAL_MS = 10_000;

/**
 * offsets[i] = milisegundos desde el inicio en que el vehículo llega al punto i.
 * Con timestamps se usa el tiempo real; sin ellos, intervalos uniformes simulados.
 */
export function buildTimeline(track, uniformIntervalMs = UNIFORM_INTERVAL_MS) {
  const { points } = track;
  const useTime = track.hasTimestamps && points.length > 1;
  const offsets = useTime
    ? points.map((p) => p.time - points[0].time)
    : points.map((_, i) => i * uniformIntervalMs);

  // Rumbo de cada segmento; si un segmento no tiene longitud (vehículo detenido)
  // conserva el rumbo anterior para que el ícono no gire a 0°.
  const raw = points.slice(1).map((b, i) => {
    const a = points[i];
    return a.lat === b.lat && a.lon === b.lon ? null : bearingDeg(a, b);
  });
  let last = raw.find((v) => v !== null) ?? 0; // los segmentos iniciales detenidos toman el primer rumbo real
  const bearings = raw.map((v) => (last = v ?? last));

  return {
    points,
    offsets,
    bearings,
    durationMs: offsets[offsets.length - 1] ?? 0,
    simulated: !useTime,
    startTime: useTime ? points[0].time : null,
  };
}

/** Índice del segmento i tal que offsets[i] <= t < offsets[i+1] (búsqueda binaria). */
export function segmentAt(offsets, t) {
  if (offsets.length < 2 || t <= offsets[0]) return 0;
  if (t >= offsets[offsets.length - 1]) return offsets.length - 2;
  let lo = 0;
  let hi = offsets.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Estado del vehículo en el instante t (ms desde el inicio).
 * @returns {{timeMs, lat, lon, bearing, speedKmh, clock, segmentIndex, reached, total, finished}}
 */
export function frameAt(timeline, t) {
  const { points, offsets, bearings, durationMs } = timeline;
  const n = points.length;
  const time = Math.min(Math.max(t, 0), durationMs);
  if (n === 1) {
    const p = points[0];
    return { timeMs: 0, lat: p.lat, lon: p.lon, bearing: 0, speedKmh: p.speedKmh, clock: p.time, segmentIndex: 0, reached: 1, total: 1, finished: true };
  }

  const i = segmentAt(offsets, time);
  const a = points[i];
  const b = points[i + 1];
  const span = offsets[i + 1] - offsets[i];
  const f = span > 0 ? Math.min(1, Math.max(0, (time - offsets[i]) / span)) : 1;
  const pos = interpolate(a, b, f);

  let speedKmh = null;
  if (Number.isFinite(a.speedKmh) && Number.isFinite(b.speedKmh)) speedKmh = a.speedKmh + (b.speedKmh - a.speedKmh) * f;
  else speedKmh = Number.isFinite(b.speedKmh) ? b.speedKmh : a.speedKmh;

  const reached = f >= 1 ? i + 2 : i + 1; // puntos ya alcanzados (1..n)
  return {
    timeMs: time,
    lat: pos.lat,
    lon: pos.lon,
    bearing: bearings[i] ?? 0,
    speedKmh,
    clock: timeline.startTime ? new Date(timeline.startTime.getTime() + time) : null,
    segmentIndex: i,
    reached,
    total: n,
    finished: time >= durationMs,
  };
}
