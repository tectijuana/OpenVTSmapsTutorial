// Panel de telemetría en vivo durante la reproducción.
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatClock, formatCoord, formatSpeed, formatTimelineLabel } from '../utils/format.js';

export function createPlaybackPanel(el) {
  el.innerHTML = `
    <div class="live-grid">
      ${cell('Vehículo', 'vehicle')}
      ${cell('Velocidad', 'speed')}
      ${cell('Latitud', 'lat')}
      ${cell('Longitud', 'lon')}
      ${cell('Hora', 'clock')}
      ${cell('Progreso', 'progress')}
    </div>`;
  const q = (k) => el.querySelector(`[data-live="${k}"]`);
  const refs = { vehicle: q('vehicle'), speed: q('speed'), lat: q('lat'), lon: q('lon'), clock: q('clock'), progress: q('progress') };

  return {
    setVehicle(id) {
      refs.vehicle.innerHTML = escapeHtml(id);
    },
    update(frame) {
      refs.speed.textContent = formatSpeed(frame.speedKmh);
      refs.lat.textContent = formatCoord(frame.lat);
      refs.lon.textContent = formatCoord(frame.lon);
      // Sin timestamps se muestra el tiempo simulado transcurrido.
      refs.clock.textContent = frame.clock ? formatClock(frame.clock) : `+${formatTimelineLabel(frame.timeMs)}`;
      refs.progress.textContent = `${frame.reached} / ${frame.total}`;
    },
  };
}

function cell(label, key) {
  return `<div class="live-cell"><span class="stat-label">${label}</span><span class="live-value" data-live="${key}">—</span></div>`;
}
