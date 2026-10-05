// Cálculos geodésicos sobre la esfera terrestre (radio medio IUGG).
export const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Distancia de círculo máximo entre dos coordenadas (fórmula de Haversine).
 * @param {{lat:number, lon:number}} a
 * @param {{lat:number, lon:number}} b
 * @returns {number} kilómetros
 */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Rumbo inicial de a hacia b, en grados (0 = norte, 90 = este).
 */
export function bearingDeg(a, b) {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Interpolación lineal entre dos coordenadas. Suficiente para segmentos GPS
 * cortos (decenas o cientos de metros).
 */
export function interpolate(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}
