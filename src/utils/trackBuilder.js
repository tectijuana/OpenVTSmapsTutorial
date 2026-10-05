// Convierte registros crudos de cualquier parser en trayectorias validadas (modelo interno).
import { haversineKm } from './haversine.js';
import { parseTimestamp } from './timestamps.js';

export class GpsDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GpsDataError';
  }
}

const DEFAULT_VEHICLE = 'SIN-ID';
// Velocidad por encima de la cual un salto entre puntos se considera sospechoso (km/h).
const SPEED_JUMP_WARNING_KMH = 300;

/**
 * @param {Array<{lat:number, lon:number, time?:any, speedKmh?:number|null,
 *                vehicleId?:string, ele?:number}>} records
 * @param {{fileName?:string, format?:string, defaultVehicleId?:string}} meta
 *        defaultVehicleId se asigna a los puntos sin vehicle_id
 * @returns {{tracks: object[], warnings: string[]}}
 */
export function buildTracks(records, meta = {}) {
  const warnings = [];
  if (!Array.isArray(records) || records.length === 0) {
    throw new GpsDataError('El archivo no contiene puntos GPS.');
  }

  let invalidCoords = 0;
  let outOfRange = 0;
  let nullIsland = 0;
  let invalidTimes = 0;
  let invalidSpeeds = 0;
  const groups = new Map();

  records.forEach((r, i) => {
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      invalidCoords++;
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      outOfRange++;
      return;
    }
    if (lat === 0 && lon === 0) {
      // Típico de receptores GPS sin señal (sin "fix").
      nullIsland++;
      return;
    }

    let time = null;
    const hasRawTime = r.time !== undefined && r.time !== null && String(r.time).trim() !== '';
    if (hasRawTime) {
      time = parseTimestamp(r.time);
      if (!time) invalidTimes++;
    }

    let speedKmh = r.speedKmh ?? null;
    if (speedKmh !== null && (!Number.isFinite(speedKmh) || speedKmh < 0)) {
      invalidSpeeds++;
      speedKmh = null;
    }

    const vehicleId = (r.vehicleId && String(r.vehicleId).trim()) || meta.defaultVehicleId || DEFAULT_VEHICLE;
    const ele = Number.isFinite(r.ele) ? r.ele : null;
    if (!groups.has(vehicleId)) groups.set(vehicleId, []);
    groups.get(vehicleId).push({ lat, lon, time, speedKmh, ele, vehicleId, order: i });
  });

  if (invalidCoords) warnings.push(`${invalidCoords} registro(s) con latitud/longitud vacía o no numérica fueron omitidos.`);
  if (outOfRange) warnings.push(`${outOfRange} registro(s) fuera de rango (latitud ±90°, longitud ±180°) fueron omitidos.`);
  if (nullIsland) warnings.push(`${nullIsland} registro(s) en 0,0 (GPS sin señal) fueron omitidos.`);
  if (invalidTimes) warnings.push(`${invalidTimes} timestamp(s) no válidos se ignoraron.`);
  if (invalidSpeeds) warnings.push(`${invalidSpeeds} velocidad(es) negativas o no numéricas se ignoraron.`);

  if (groups.size === 0) {
    throw new GpsDataError('Ningún registro tiene coordenadas válidas. Revise que latitud y longitud sean números decimales (ej. 32.52879, -116.98819).');
  }

  const tracks = [];
  const multiVehicle = groups.size > 1;
  for (const [vehicleId, pts] of groups) {
    const track = finalizeTrack(vehicleId, pts, { ...meta, multiVehicle }, warnings);
    if (track) tracks.push(track);
  }
  return { tracks, warnings };
}

function finalizeTrack(vehicleId, pts, meta, warnings) {
  const prefix = (msg) => (meta.multiVehicle ? `[${vehicleId}] ${msg}` : msg);
  const timed = pts.filter((p) => p.time).length;
  let hasTimestamps = timed === pts.length;

  if (hasTimestamps) {
    const outOfOrder = pts.some((p, i) => i > 0 && p.time < pts[i - 1].time);
    if (outOfOrder) {
      // Sort es estable: puntos con el mismo timestamp conservan el orden del archivo.
      pts.sort((a, b) => a.time - b.time || a.order - b.order);
      warnings.push(prefix('Los puntos no estaban en orden cronológico; se ordenaron por timestamp.'));
    }
  } else if (timed > 0) {
    warnings.push(prefix(`Solo ${timed} de ${pts.length} puntos tienen timestamp; se usa el orden del archivo e intervalos uniformes.`));
  }

  // Elimina puntos duplicados consecutivos (misma posición y misma hora).
  const unique = [];
  let duplicates = 0;
  for (const p of pts) {
    const prev = unique[unique.length - 1];
    const sameTime = prev && (prev.time?.getTime() ?? null) === (p.time?.getTime() ?? null);
    if (prev && prev.lat === p.lat && prev.lon === p.lon && sameTime) {
      duplicates++;
      continue;
    }
    unique.push(p);
  }
  if (duplicates) warnings.push(prefix(`${duplicates} punto(s) duplicados fueron eliminados.`));

  if (hasTimestamps && unique.length > 1 && unique[unique.length - 1].time - unique[0].time === 0) {
    warnings.push(prefix('Todos los puntos tienen el mismo timestamp; la reproducción usará intervalos uniformes.'));
    hasTimestamps = false;
  }

  // Distancias Haversine acumuladas y velocidad calculada cuando el archivo no la trae.
  let cum = 0;
  let suspiciousJumps = 0;
  const points = unique.map((p, i) => {
    const prev = unique[i - 1];
    const segKm = prev ? haversineKm(prev, p) : 0;
    cum += segKm;
    let speedKmh = p.speedKmh;
    let speedSource = speedKmh === null ? null : 'archivo';
    if (prev && prev.time && p.time) {
      const hours = (p.time - prev.time) / 3_600_000;
      if (hours > 0) {
        const computed = segKm / hours;
        if (computed > SPEED_JUMP_WARNING_KMH) suspiciousJumps++;
        if (speedKmh === null) {
          speedKmh = computed;
          speedSource = 'calculada';
        }
      }
    }
    return {
      index: i + 1,
      lat: p.lat,
      lon: p.lon,
      time: p.time,
      speedKmh,
      speedSource,
      ele: p.ele,
      vehicleId,
      cumDistKm: cum,
    };
  });
  if (points.length > 1 && points[0].speedKmh === null && points[1].speedSource === 'calculada') {
    points[0].speedKmh = 0;
    points[0].speedSource = 'calculada';
  }
  if (suspiciousJumps) {
    warnings.push(prefix(`${suspiciousJumps} salto(s) implican más de ${SPEED_JUMP_WARNING_KMH} km/h; revise posibles errores de GPS.`));
  }

  return {
    vehicleId,
    fileName: meta.fileName ?? '',
    format: meta.format ?? '',
    hasTimestamps,
    points,
    stats: computeStats(points, hasTimestamps),
  };
}

export function computeStats(points, hasTimestamps) {
  const distanceKm = points.length ? points[points.length - 1].cumDistKm : 0;
  const durationMs = hasTimestamps && points.length > 1 ? points[points.length - 1].time - points[0].time : null;
  const speeds = points.map((p) => p.speedKmh).filter(Number.isFinite);
  const reported = points.filter((p) => p.speedSource === 'archivo').map((p) => p.speedKmh);
  const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  // Velocidad media de recorrido: distancia Haversine / tiempo total.
  const travelAvgKmh = durationMs > 0 ? distanceKm / (durationMs / 3_600_000) : null;
  return {
    pointCount: points.length,
    distanceKm,
    durationMs,
    maxSpeedKmh: speeds.length ? Math.max(...speeds) : null,
    // Si el archivo trae velocidades del sensor, el promedio es sobre esas lecturas.
    avgSpeedKmh: reported.length ? mean(reported) : travelAvgKmh ?? mean(speeds),
    avgSpeedSource: reported.length ? 'archivo' : travelAvgKmh !== null ? 'distancia/tiempo' : speeds.length ? 'calculada' : null,
    travelAvgKmh,
  };
}
