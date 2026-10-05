// Utilidades compartidas por los parsers GPX y KML (DOMParser del navegador).
import { GpsDataError } from '../utils/trackBuilder.js';

export function parseXml(text, formatName) {
  if (typeof DOMParser === 'undefined') throw new GpsDataError(`${formatName} requiere un navegador (DOMParser).`);
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new GpsDataError(`El archivo ${formatName} no es XML válido (¿está incompleto o dañado?).`);
  }
  return doc;
}

/** Elementos por nombre local ignorando namespaces (gpx:trkpt, gx:coord, ...). */
export const byLocalName = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));

export function childText(el, name) {
  const child = byLocalName(el, name)[0];
  return child ? child.textContent.trim() : undefined;
}
