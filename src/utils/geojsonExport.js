// Trayectoria validada → GeoJSON RFC 7946 (ejercicio D.3).
// Un LineString con tiempos y velocidades por vértice (convención coordTimes de togeojson),
// que el propio parser GeoJSON de la app vuelve a leer sin pérdida.
export function trackToGeoJson(track) {
  const pts = track.points;
  const coordinates = pts.map((p) => (Number.isFinite(p.ele) ? [p.lon, p.lat, p.ele] : [p.lon, p.lat]));
  const round = (v, d) => (Number.isFinite(v) ? Number(v.toFixed(d)) : null);
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: pts.length > 1 ? { type: 'LineString', coordinates } : { type: 'Point', coordinates: coordinates[0] },
        properties: {
          vehicle_id: track.vehicleId,
          source_file: track.fileName,
          source_format: track.format,
          point_count: track.stats.pointCount,
          distance_km: round(track.stats.distanceKm, 3),
          duration_s: track.stats.durationMs === null ? null : Math.round(track.stats.durationMs / 1000),
          max_speed_kmh: round(track.stats.maxSpeedKmh, 1),
          ...(pts.length > 1
            ? {
                coordTimes: pts.map((p) => (p.time ? p.time.toISOString() : null)),
                coordinateProperties: {
                  times: pts.map((p) => (p.time ? p.time.toISOString() : null)),
                  speeds: pts.map((p) => round(p.speedKmh, 2)),
                  speed_sources: pts.map((p) => p.speedSource),
                },
              }
            : { timestamp: pts[0].time ? pts[0].time.toISOString() : null, speed_kmh: round(pts[0].speedKmh, 2) }),
        },
      },
    ],
  };
}

export function exportFileName(track) {
  const base = (track.fileName || 'ruta').replace(/\.[^.]+$/, '');
  const vehicle = String(track.vehicleId).replace(/[^\w-]+/g, '_');
  return `${base}_${vehicle}_limpio.geojson`;
}
