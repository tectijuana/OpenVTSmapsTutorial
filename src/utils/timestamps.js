// Conversión de valores de fecha/hora heterogéneos a Date.

const DATE_TIME_SPACE = /^(\d{4}-\d{2}-\d{2})[ ](\d{2}:\d{2}(:\d{2}(\.\d+)?)?)(.*)$/;

/**
 * Acepta ISO 8601 ("2026-10-04T18:00:00", con o sin zona), "YYYY-MM-DD HH:MM:SS",
 * epoch en segundos (10 dígitos) o milisegundos (13 dígitos), o un Date.
 * Las fechas sin zona horaria se interpretan en la hora local del navegador.
 * @returns {Date|null} null si el valor está vacío o no es válido
 */
export function parseTimestamp(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') return fromEpoch(value);

  const s = String(value).trim();
  if (!s) return null;

  if (/^\d{9,10}(\.\d+)?$/.test(s)) return fromEpoch(Number(s) * 1000);
  if (/^\d{12,13}$/.test(s)) return fromEpoch(Number(s));

  const m = s.match(DATE_TIME_SPACE);
  const iso = m ? `${m[1]}T${m[2]}${m[5].trim()}` : s;
  // Solo se aceptan cadenas que empiezan con fecha ISO; Date.parse acepta
  // formatos ambiguos ("4/10/2026") que dependen del navegador.
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fromEpoch(ms) {
  // Si el número es pequeño, se trata de segundos y no de milisegundos.
  const d = new Date(ms < 1e11 ? ms * 1000 : ms);
  return Number.isNaN(d.getTime()) ? null : d;
}
