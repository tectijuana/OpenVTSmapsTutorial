import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, splitCsv } from '../src/parsers/csvParser.js';
import { parseGeoJson } from '../src/parsers/geojsonParser.js';
import { detectFormat, parseGpsFile } from '../src/parsers/index.js';
import { parseTimestamp } from '../src/utils/timestamps.js';
import { GpsDataError } from '../src/utils/trackBuilder.js';

const demo = (f) => readFileSync(new URL(`../src/assets/demo/${f}`, import.meta.url), 'utf8');

test('CSV demo: 16 registros con velocidad y vehículo', () => {
  const { records, warnings } = parseCsv(demo('tectijuana_demo.csv'));
  assert.equal(records.length, 16);
  assert.deepEqual(warnings, []);
  assert.equal(records[0].lat, 32.52879);
  assert.equal(records[0].lon, -116.98819);
  assert.equal(records[4].speedKmh, 42);
  assert.equal(records[0].vehicleId, 'AUTO-DEMO-01');
});

test('CSV con punto y coma, coma decimal y encabezados en español', () => {
  const { records } = parseCsv('Fecha;Latitud;Longitud;Velocidad (km/h)\n2026-10-04 18:00:00;32,5;-116,9;10\n');
  assert.equal(records[0].lat, 32.5);
  assert.equal(records[0].lon, -116.9);
  assert.equal(records[0].speedKmh, 10);
});

test('CSV: speed_ms se convierte a km/h', () => {
  const { records } = parseCsv('lat,lon,speed_ms\n32.5,-116.9,10\n');
  assert.equal(records[0].speedKmh, 36);
});

test('CSV sin columnas de coordenadas da error amigable', () => {
  assert.throws(() => parseCsv('fecha,valor\n1,2\n'), (e) => e instanceof GpsDataError && /latitude, longitude/.test(e.message));
});

test('CSV respeta comillas', () => {
  assert.deepEqual(splitCsv('a,b\n"x, y","comilla ""doble"""\n', ','), [['a', 'b'], ['x, y', 'comilla "doble"']]);
});

test('GeoJSON demo (Point) y LineString con coordTimes', () => {
  assert.equal(parseGeoJson(demo('tectijuana_demo.geojson')).records.length, 16);
  const line = {
    type: 'Feature',
    properties: { name: 'x', coordTimes: ['2026-10-04T18:00:00Z', '2026-10-04T18:00:10Z'] },
    geometry: { type: 'LineString', coordinates: [[-116.98, 32.52], [-116.97, 32.53]] },
  };
  const { records } = parseGeoJson(JSON.stringify(line));
  assert.equal(records[1].lat, 32.53);
  assert.equal(records[1].time, '2026-10-04T18:00:10Z');
});

test('GeoJSON inválido da error amigable', () => {
  assert.throws(() => parseGeoJson('{malo'), GpsDataError);
});

test('detección de formato por extensión y contenido', () => {
  assert.equal(detectFormat('a.GPX', ''), 'gpx');
  assert.equal(detectFormat('datos.json', '{"type":"FeatureCollection"}'), 'geojson');
  assert.equal(detectFormat('export.txt', '<?xml version="1.0"?><gpx>'), 'gpx');
  assert.equal(detectFormat('export.txt', 'lat,lon\n1,2'), 'csv');
});

test('archivo vacío', () => {
  assert.throws(() => parseGpsFile('x.csv', '  \n'), /vacío/);
});

test('timestamps: ISO, con espacio, epoch s/ms e inválidos', () => {
  assert.equal(parseTimestamp('2026-10-04T18:00:00Z').toISOString(), '2026-10-04T18:00:00.000Z');
  assert.equal(parseTimestamp('2026-10-04 18:00:00Z').toISOString(), '2026-10-04T18:00:00.000Z');
  assert.equal(parseTimestamp('1791136800').toISOString(), parseTimestamp('1791136800000').toISOString());
  assert.equal(parseTimestamp('ayer a las seis'), null);
  assert.equal(parseTimestamp('4/10/2026'), null);
  assert.equal(parseTimestamp(''), null);
});
