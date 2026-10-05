// Contenido del popup al hacer clic en un punto GPS.
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatCoord, formatDateTime, formatSpeed } from '../utils/format.js';

export function pointPopupHtml(p, total, title = 'Punto GPS') {
  const speedNote = p.speedSource === 'calculada' ? ' <small>(calculada)</small>' : '';
  const ele = Number.isFinite(p.ele) ? `<dt>Altitud</dt><dd>${p.ele.toFixed(1)} m</dd>` : '';
  return `
    <div class="point-popup">
      <h4>${escapeHtml(title)} · ${p.index} / ${total}</h4>
      <dl>
        <dt>Latitud</dt><dd>${formatCoord(p.lat)}</dd>
        <dt>Longitud</dt><dd>${formatCoord(p.lon)}</dd>
        <dt>Fecha/hora</dt><dd>${formatDateTime(p.time)}</dd>
        <dt>Velocidad</dt><dd>${formatSpeed(p.speedKmh)}${speedNote}</dd>
        <dt>Vehículo</dt><dd>${escapeHtml(p.vehicleId)}</dd>
        <dt>Punto</dt><dd>${p.index} de ${total}</dd>
        ${ele}
      </dl>
    </div>`;
}
