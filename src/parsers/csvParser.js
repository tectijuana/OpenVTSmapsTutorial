// CSV → registros crudos. Detecta delimitador (, ; tab) y columnas por alias.
import { resolveFields, recordFromFields } from '../utils/fieldAliases.js';
import { GpsDataError } from '../utils/trackBuilder.js';

/** Divide texto CSV en filas respetando comillas dobles (RFC 4180). */
export function splitCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && field === '') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

export function detectDelimiter(headerLine) {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text) {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows = splitCsv(clean, delimiter);
  if (rows.length === 0) throw new GpsDataError('El archivo CSV está vacío.');

  const header = rows[0].map((h) => h.trim());
  const fields = resolveFields(header);
  const missing = [];
  if (!fields.lat) missing.push('latitude');
  if (!fields.lon) missing.push('longitude');
  if (missing.length) {
    throw new GpsDataError(
      `No se encontraron las columnas requeridas: ${missing.join(', ')}. ` +
        `Columnas detectadas: ${header.join(', ') || '(ninguna)'}. ` +
        'La primera fila debe ser el encabezado, por ejemplo: timestamp,latitude,longitude,speed_kmh,vehicle_id'
    );
  }
  if (rows.length === 1) throw new GpsDataError('El CSV solo contiene el encabezado; no hay filas de datos.');

  const warnings = [];
  let badWidth = 0;
  const records = rows.slice(1).map((cells) => {
    if (cells.length !== header.length) badWidth++;
    const obj = {};
    header.forEach((h, i) => (obj[h] = cells[i]));
    return recordFromFields(obj, fields);
  });
  if (badWidth) warnings.push(`${badWidth} fila(s) del CSV tienen un número de columnas distinto al encabezado.`);
  if (!fields.time) warnings.push('El CSV no tiene columna de timestamp; la reproducción usará intervalos uniformes.');
  return { records, warnings };
}
