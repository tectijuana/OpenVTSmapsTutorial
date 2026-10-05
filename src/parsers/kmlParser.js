// KML → registros crudos. Soporta gx:Track (con <when>), LineString y Placemark/Point.
import { parseXml, byLocalName, childText } from './xmlUtils.js';
import { GpsDataError } from '../utils/trackBuilder.js';
import { resolveFields, recordFromFields, toNumber } from '../utils/fieldAliases.js';

/** "lon,lat[,alt] lon,lat[,alt] ..." → [{lat, lon, ele}] */
export function parseKmlCoordinates(text) {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tuple) => {
      const [lon, lat, ele] = tuple.split(',').map(toNumber);
      return { lat, lon, ele };
    });
}

function extendedData(placemark) {
  const data = {};
  for (const d of byLocalName(placemark, 'Data')) data[d.getAttribute('name')] = childText(d, 'value');
  for (const d of byLocalName(placemark, 'SimpleData')) data[d.getAttribute('name')] = d.textContent.trim();
  return data;
}

export function parseKml(text) {
  const doc = parseXml(text, 'KML');
  const warnings = [];
  const records = [];

  for (const pm of byLocalName(doc, 'Placemark')) {
    const name = childText(pm, 'name') || '';
    const ext = extendedData(pm);
    const extFields = resolveFields(Object.keys(ext));
    const extRecord = recordFromFields(ext, extFields);
    const vehicleId = extRecord.vehicleId || '';

    const tracks = byLocalName(pm, 'Track');
    if (tracks.length) {
      for (const tr of tracks) {
        const whens = byLocalName(tr, 'when').map((w) => w.textContent.trim());
        const coords = byLocalName(tr, 'coord').map((c) => {
          const [lon, lat, ele] = c.textContent.trim().split(/\s+/).map(toNumber);
          return { lat, lon, ele };
        });
        coords.forEach((c, i) => records.push({ ...c, time: whens[i], speedKmh: null, vehicleId: vehicleId || name }));
      }
      continue;
    }

    const lines = byLocalName(pm, 'LineString');
    if (lines.length) {
      for (const ls of lines) {
        for (const c of parseKmlCoordinates(childText(ls, 'coordinates') ?? '')) {
          records.push({ ...c, time: undefined, speedKmh: null, vehicleId: vehicleId || name });
        }
      }
      continue;
    }

    const point = byLocalName(pm, 'Point')[0];
    if (point) {
      const [c] = parseKmlCoordinates(childText(point, 'coordinates') ?? '');
      if (!c) continue;
      const when = childText(pm, 'when');
      records.push({
        ...c,
        time: when ?? extRecord.time,
        speedKmh: extRecord.speedKmh,
        vehicleId,
      });
    }
  }

  if (!records.length) throw new GpsDataError('El KML no contiene Placemark con Point, LineString o gx:Track.');
  if (records.every((r) => r.time === undefined)) {
    warnings.push('El KML no incluye fecha/hora; la reproducción usará intervalos uniformes.');
  }
  return { records, warnings };
}
