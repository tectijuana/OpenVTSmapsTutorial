// Detección de formato y despacho al parser correspondiente.
import { parseCsv } from './csvParser.js';
import { parseGpx } from './gpxParser.js';
import { parseKml } from './kmlParser.js';
import { parseGeoJson } from './geojsonParser.js';
import { parseNmea } from './nmeaParser.js';
import { GpsDataError } from '../utils/trackBuilder.js';

export const SUPPORTED_EXTENSIONS = ['csv', 'txt', 'gpx', 'kml', 'geojson', 'json', 'nmea'];

const PARSERS = { csv: parseCsv, gpx: parseGpx, kml: parseKml, geojson: parseGeoJson, nmea: parseNmea };

/** Formato por extensión; si no es concluyente, inspecciona el contenido. */
export function detectFormat(fileName, text) {
  const ext = String(fileName).split('.').pop().toLowerCase();
  if (ext === 'csv') return 'csv';
  if (ext === 'gpx') return 'gpx';
  if (ext === 'kml') return 'kml';
  if (ext === 'geojson') return 'geojson';
  if (ext === 'nmea') return 'nmea';
  if (ext === 'kmz') throw new GpsDataError('Los archivos KMZ están comprimidos; descomprímalos y cargue el archivo .kml interno.');

  const head = text.trimStart().slice(0, 500);
  if (/^\$G[A-Z]{4},/.test(head)) return 'nmea';
  if (head.startsWith('{') || head.startsWith('[')) return 'geojson';
  if (/<gpx[\s>]/i.test(head)) return 'gpx';
  if (/<kml[\s>]/i.test(head)) return 'kml';
  if (head.startsWith('<')) throw new GpsDataError('El archivo XML no es GPX ni KML.');
  return 'csv';
}

/**
 * @returns {{format:string, records:object[], warnings:string[]}}
 */
export function parseGpsFile(fileName, text) {
  if (!text || !text.trim()) throw new GpsDataError('El archivo está vacío.');
  const format = detectFormat(fileName, text);
  const { records, warnings } = PARSERS[format](text);
  return { format, records, warnings };
}
