// GPX 1.0/1.1 → registros crudos. Usa trkpt; si no hay, rtept; si no, wpt.
import { parseXml, byLocalName, childText } from './xmlUtils.js';
import { GpsDataError } from '../utils/trackBuilder.js';
import { toNumber } from '../utils/fieldAliases.js';

export function parseGpx(text) {
  const doc = parseXml(text, 'GPX');
  const warnings = [];
  let kind = 'trkpt';
  let nodes = byLocalName(doc, 'trkpt');
  if (!nodes.length) {
    kind = 'rtept';
    nodes = byLocalName(doc, 'rtept');
  }
  if (!nodes.length) {
    kind = 'wpt';
    nodes = byLocalName(doc, 'wpt');
  }
  if (!nodes.length) throw new GpsDataError('El GPX no contiene puntos (trkpt, rtept ni wpt).');
  if (kind !== 'trkpt') warnings.push(`El GPX no tiene track; se usaron los puntos <${kind}>.`);

  const records = nodes.map((pt) => {
    // GPX 1.0 tiene <speed> en m/s; GPX 1.1 suele traerla en <extensions>.
    const speedMs = toNumber(childText(pt, 'speed'));
    const container = pt.closest?.('trk, rte') ?? pt.parentNode?.parentNode;
    const vehicleId = (container && childText(container, 'name')) || '';
    return {
      lat: toNumber(pt.getAttribute('lat')),
      lon: toNumber(pt.getAttribute('lon')),
      time: childText(pt, 'time'),
      ele: toNumber(childText(pt, 'ele')),
      speedKmh: Number.isFinite(speedMs) ? speedMs * 3.6 : null,
      vehicleId: kind === 'wpt' ? '' : vehicleId,
    };
  });
  return { records, warnings };
}
