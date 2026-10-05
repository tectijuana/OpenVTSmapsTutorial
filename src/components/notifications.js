// Mensajes amigables de error y advertencia.
import { escapeHtml } from '../utils/escapeHtml.js';

export function showMessages(el, { error, warnings = [] } = {}) {
  const parts = [];
  if (error) {
    parts.push(`<div class="msg msg-error" role="alert"><strong>No se pudo cargar el archivo.</strong> ${escapeHtml(error)}</div>`);
  }
  if (warnings.length) {
    const items = warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('');
    parts.push(`<div class="msg msg-warning"><strong>Avisos de validación (${warnings.length})</strong><ul>${items}</ul></div>`);
  }
  el.innerHTML = parts.join('');
  el.hidden = parts.length === 0;
}
