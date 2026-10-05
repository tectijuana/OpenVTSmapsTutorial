import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/parsers/csvParser.js';
import { buildTracks, GpsDataError } from '../src/utils/trackBuilder.js';

const demo = (f) => readFileSync(new URL(`../src/assets/demo/${f}`, import.meta.url), 'utf8');

test('ruta demo: estadísticas', () => {
  const { tracks, warnings } = buildTracks(parseCsv(demo('tectijuana_demo.csv')).records, { fileName: 'tectijuana_demo.csv' });
  assert.equal(tracks.length, 1);
  assert.deepEqual(warnings, []);
  const t = tracks[0];
  assert.equal(t.vehicleId, 'AUTO-DEMO-01');
  assert.equal(t.hasTimestamps, true);
  assert.equal(t.stats.pointCount, 16);
  assert.equal(t.stats.durationMs, 5 * 60 * 1000);
  assert.equal(t.stats.maxSpeedKmh, 47);
  assert.ok(t.stats.distanceKm > 5.5 && t.stats.distanceKm < 6, `distancia ${t.stats.distanceKm}`);
  assert.equal(t.points[15].index, 16);
});

test('CSV de práctica con errores: se omiten y reportan', () => {
  const { tracks, warnings } = buildTracks(parseCsv(demo('practica_errores.csv')).records, {});
  const t = tracks[0];
  const text = warnings.join('\n');
  assert.match(text, /vacía o no numérica/);
  assert.match(text, /fuera de rango/);
  assert.match(text, /0,0/);
  assert.match(text, /timestamp\(s\) no válidos/);
  assert.match(text, /negativas/);
  assert.match(text, /duplicados/);
  // 11 filas − vacía − 2 fuera de rango − 0,0 − 1 duplicado = 6 puntos
  assert.equal(t.points.length, 6);
  // Hay un timestamp inválido → no todos tienen hora → orden del archivo
  assert.equal(t.hasTimestamps, false);
});

test('ordena cronológicamente cuando todos tienen timestamp', () => {
  const recs = [
    { lat: 32.53, lon: -116.97, time: '2026-10-04T18:00:20' },
    { lat: 32.52, lon: -116.98, time: '2026-10-04T18:00:00' },
  ];
  const { tracks, warnings } = buildTracks(recs);
  assert.equal(tracks[0].points[0].lat, 32.52);
  assert.match(warnings.join(), /orden cronológico/);
  // Velocidad calculada a partir de distancia/tiempo
  assert.equal(tracks[0].points[1].speedSource, 'calculada');
});

test('agrupa por vehicle_id', () => {
  const { tracks } = buildTracks(parseCsv(demo('flotilla_demo.csv')).records);
  assert.deepEqual(tracks.map((t) => t.vehicleId), ['AUTO-DEMO-01', 'CAMION-07']);
});

test('sin puntos válidos lanza GpsDataError', () => {
  assert.throws(() => buildTracks([{ lat: 'x', lon: 1 }]), GpsDataError);
  assert.throws(() => buildTracks([]), GpsDataError);
});
