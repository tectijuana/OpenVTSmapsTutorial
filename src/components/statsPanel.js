// Panel lateral con el resumen de la trayectoria.
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDuration, formatKm, formatSpeed } from '../utils/format.js';

const FORMAT_LABEL = { csv: 'CSV', gpx: 'GPX', kml: 'KML', geojson: 'GeoJSON', nmea: 'NMEA' };

export function renderStats(el, track) {
  const s = track.stats;
  const avgNote =
    s.avgSpeedSource === 'archivo' && Number.isFinite(s.travelAvgKmh)
      ? `<small>Promedio de lecturas del sensor · distancia/tiempo: ${formatSpeed(s.travelAvgKmh)}</small>`
      : s.avgSpeedSource
        ? `<small>Calculada (${escapeHtml(s.avgSpeedSource)})</small>`
        : '';
  const durationNote = track.hasTimestamps ? '' : '<small>Sin timestamps: no se puede calcular</small>';

  el.innerHTML = `
    ${stat('Archivo', `${escapeHtml(track.fileName)} <span class="badge">${FORMAT_LABEL[track.format] ?? ''}</span>`)}
    ${stat('Vehículo', escapeHtml(track.vehicleId))}
    ${stat('Puntos GPS', s.pointCount)}
    ${stat('Distancia', formatKm(s.distanceKm), '<small>Fórmula de Haversine</small>')}
    ${stat('Duración', track.hasTimestamps ? formatDuration(s.durationMs) : '—', durationNote)}
    ${stat('Velocidad máxima', formatSpeed(s.maxSpeedKmh))}
    ${stat('Velocidad promedio', formatSpeed(s.avgSpeedKmh), avgNote)}
  `;
}

function stat(label, value, note = '') {
  return `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value}</span>${note}</div>`;
}
