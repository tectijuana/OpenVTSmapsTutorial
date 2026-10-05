import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/parsers/csvParser.js';
import { parseGeoJson } from '../src/parsers/geojsonParser.js';
import { buildTracks } from '../src/utils/trackBuilder.js';
import { speedColor, segmentSpeed, UNKNOWN_SPEED_COLOR } from '../src/utils/speedColors.js';
import { trackToGeoJson, exportFileName } from '../src/utils/geojsonExport.js';

const demo = (f) => readFileSync(new URL(`../src/assets/demo/${f}`, import.meta.url), 'utf8');

test('D.2: bandas de color por velocidad', () => {
  assert.equal(speedColor(0), '#16a34a');
  assert.equal(speedColor(29.9), '#16a34a');
  assert.equal(speedColor(30), '#eab308');
  assert.equal(speedColor(60), '#dc2626');
  assert.equal(speedColor(null), UNKNOWN_SPEED_COLOR);
  assert.equal(segmentSpeed({ speedKmh: 20 }, { speedKmh: 40 }), 30);
  assert.equal(segmentSpeed({ speedKmh: null }, { speedKmh: 40 }), 40);
});

test('D.3: exportar GeoJSON limpio y volver a importarlo sin pérdida', () => {
  const { tracks } = buildTracks(parseCsv(demo('practica_errores.csv')).records, { fileName: 'practica_errores.csv', format: 'csv' });
  const original = tracks[0];
  const geojson = trackToGeoJson(original);
  assert.equal(geojson.features[0].geometry.type, 'LineString');
  assert.equal(exportFileName(original), 'practica_errores_AUTO-DEMO-02_limpio.geojson');

  const again = buildTracks(parseGeoJson(JSON.stringify(geojson)).records).tracks[0];
  assert.equal(again.vehicleId, original.vehicleId);
  assert.equal(again.points.length, original.points.length);
  assert.deepEqual(again.points.map((p) => [p.lat, p.lon]), original.points.map((p) => [p.lat, p.lon]));
  assert.ok(Math.abs(again.stats.distanceKm - original.stats.distanceKm) < 1e-9);
});

test('D.3: conserva timestamps de la ruta demo', () => {
  const t = buildTracks(parseCsv(demo('tectijuana_demo.csv')).records).tracks[0];
  const again = buildTracks(parseGeoJson(JSON.stringify(trackToGeoJson(t))).records).tracks[0];
  assert.equal(again.hasTimestamps, true);
  assert.equal(again.stats.durationMs, 300_000);
  assert.equal(again.stats.maxSpeedKmh, 47);
});
