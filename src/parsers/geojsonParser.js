// GeoJSON (RFC 7946) → registros crudos. Coordenadas en orden [longitud, latitud, altitud].
import { GpsDataError } from '../utils/trackBuilder.js';
import { resolveFields, recordFromFields } from '../utils/fieldAliases.js';

export function parseGeoJson(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new GpsDataError(`El GeoJSON no es JSON válido: ${e.message}`);
  }
  const features = toFeatures(json);
  if (!features.length) throw new GpsDataError('El GeoJSON no contiene geometrías.');

  const warnings = [];
  const records = [];
  let unsupported = 0;
  for (const f of features) {
    const props = f.properties ?? {};
    const fields = resolveFields(Object.keys(props));
    const base = recordFromFields(props, fields);
    const g = f.geometry;
    if (!g) continue;

    if (g.type === 'Point') {
      records.push({ ...base, ...coord(g.coordinates), ele: coord(g.coordinates).ele ?? base.ele });
    } else if (g.type === 'LineString' || g.type === 'MultiPoint') {
      records.push(...lineRecords(g.coordinates, props, base));
    } else if (g.type === 'MultiLineString') {
      // coordTimes/coordinateProperties.times puede venir anidado por línea.
      g.coordinates.forEach((line, i) => records.push(...lineRecords(line, props, base, i)));
    } else unsupported++;
  }
  if (unsupported) warnings.push(`${unsupported} geometría(s) no soportadas (Polygon, etc.) fueron ignoradas.`);
  if (!records.length) throw new GpsDataError('El GeoJSON no contiene geometrías Point, LineString o MultiLineString.');
  return { records, warnings };
}

function toFeatures(json) {
  if (!json || typeof json !== 'object') return [];
  if (json.type === 'FeatureCollection') return Array.isArray(json.features) ? json.features : [];
  if (json.type === 'Feature') return [json];
  if (json.type && json.coordinates) return [{ type: 'Feature', geometry: json, properties: {} }];
  return [];
}

function coord(c) {
  if (!Array.isArray(c)) return { lat: NaN, lon: NaN };
  return { lon: Number(c[0]), lat: Number(c[1]), ele: Number.isFinite(c[2]) ? c[2] : undefined };
}

function lineRecords(coords, props, base, lineIndex) {
  // Convención de togeojson/Strava: properties.coordTimes o coordinateProperties.times
  let times = props.coordTimes ?? props.coordinateProperties?.times;
  if (lineIndex !== undefined && Array.isArray(times?.[0])) times = times[lineIndex];
  const speeds = props.speeds ?? props.coordinateProperties?.speeds;
  return (coords ?? []).map((c, i) => {
    const p = coord(c);
    return {
      ...base,
      lat: p.lat,
      lon: p.lon,
      ele: p.ele ?? NaN,
      time: Array.isArray(times) ? times[i] : undefined,
      speedKmh: Array.isArray(speeds) && Number.isFinite(speeds[i]) ? speeds[i] : base.speedKmh,
    };
  });
}
