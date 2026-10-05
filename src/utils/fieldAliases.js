// Reconocimiento de nombres de columna/propiedad equivalentes en CSV, GeoJSON y KML.

const ALIASES = {
  lat: ['latitude', 'lat', 'latitud', 'y'],
  lon: ['longitude', 'lon', 'lng', 'long', 'longitud', 'x'],
  time: ['timestamp', 'time', 'datetime', 'date_time', 'fecha_hora', 'fechahora', 'fecha', 'gps_time', 'utc', 'when'],
  speedKmh: ['speed_kmh', 'speed_km_h', 'kmh', 'km_h', 'velocidad_kmh', 'velocidad_km_h', 'velocidad', 'speed'],
  speedMs: ['speed_ms', 'speed_mps', 'speed_m_s'],
  speedMph: ['speed_mph', 'mph'],
  speedKnots: ['speed_knots', 'speed_kn', 'knots'],
  vehicleId: ['vehicle_id', 'vehicleid', 'vehicle', 'id_vehiculo', 'vehiculo', 'device_id', 'deviceid', 'device', 'unit_id', 'imei', 'tracker_id'],
  ele: ['elevation', 'altitude', 'ele', 'alt', 'altitud'],
};

const SPEED_FACTORS = { speedKmh: 1, speedMs: 3.6, speedMph: 1.609344, speedKnots: 1.852 };

/** "Velocidad (km/h)" → "velocidad_km_h" */
export function normalizeKey(key) {
  return String(key)
    .replace(/^﻿/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Relaciona los nombres originales con los campos internos.
 * @param {string[]} keys nombres tal como vienen en el archivo
 * @returns {{lat?:string, lon?:string, time?:string, vehicleId?:string, ele?:string,
 *            speed?:{key:string, factor:number}}}
 */
export function resolveFields(keys) {
  const byNorm = new Map();
  for (const k of keys) {
    const n = normalizeKey(k);
    if (!byNorm.has(n)) byNorm.set(n, k);
  }
  const find = (field) => {
    for (const alias of ALIASES[field]) if (byNorm.has(alias)) return byNorm.get(alias);
    return undefined;
  };

  const out = {};
  for (const field of ['lat', 'lon', 'time', 'vehicleId', 'ele']) {
    const k = find(field);
    if (k !== undefined) out[field] = k;
  }
  for (const field of ['speedKmh', 'speedMs', 'speedMph', 'speedKnots']) {
    const k = find(field);
    if (k !== undefined) {
      out.speed = { key: k, factor: SPEED_FACTORS[field] };
      break;
    }
  }
  return out;
}

/** Convierte "32,5288" (coma decimal) o "32.5288" a número; NaN si no es numérico. */
export function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return value;
  const s = String(value).trim();
  if (!s) return NaN;
  const normalized = /^-?\d+,\d+$/.test(s) ? s.replace(',', '.') : s;
  return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

/** Lee un registro (objeto clave→valor) con el mapeo de resolveFields. */
export function recordFromFields(obj, fields) {
  const speedRaw = fields.speed ? toNumber(obj[fields.speed.key]) : NaN;
  const vehicle = fields.vehicleId ? obj[fields.vehicleId] : undefined;
  return {
    lat: fields.lat ? toNumber(obj[fields.lat]) : NaN,
    lon: fields.lon ? toNumber(obj[fields.lon]) : NaN,
    time: fields.time ? obj[fields.time] : undefined,
    speedKmh: Number.isFinite(speedRaw) ? speedRaw * fields.speed.factor : null,
    vehicleId: vehicle === undefined || vehicle === null ? '' : String(vehicle).trim(),
    ele: fields.ele ? toNumber(obj[fields.ele]) : NaN,
  };
}
