import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseNmea, nmeaChecksumOk, nmeaCoordToDeg } from '../src/parsers/nmeaParser.js';
import { detectFormat } from '../src/parsers/index.js';
import { buildTracks, GpsDataError } from '../src/utils/trackBuilder.js';

// Ejemplo clásico de la especificación NMEA 0183
const RMC = '$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A';

test('checksum NMEA', () => {
  assert.equal(nmeaChecksumOk(RMC), true);
  assert.equal(nmeaChecksumOk(RMC.replace('*6A', '*6B')), false);
});

test('ddmm.mmmm → grados decimales con hemisferio', () => {
  assert.ok(Math.abs(nmeaCoordToDeg('4807.038', 'N') - 48.1173) < 1e-6);
  assert.ok(Math.abs(nmeaCoordToDeg('01131.000', 'E') - 11.516667) < 1e-6);
  assert.ok(nmeaCoordToDeg('11659.2914', 'W') < 0);
});

test('RMC: posición, fecha/hora UTC y nudos → km/h', () => {
  const [r] = parseNmea(RMC).records;
  assert.equal(r.time, '1994-03-23T12:35:19Z');
  assert.ok(Math.abs(r.speedKmh - 22.4 * 1.852) < 1e-9);
});

test('descarta checksum malo y estado V', () => {
  const text = [RMC.replace('*6A', '*00'), '$GPRMC,123520,V,,,,,,,230394,,', RMC].join('\n');
  const { records, warnings } = parseNmea(text);
  assert.equal(records.length, 1);
  assert.match(warnings.join(), /checksum/);
  assert.match(warnings.join(), /estado V/);
});

test('ruta demo NMEA equivale a la demo CSV', () => {
  const text = readFileSync(new URL('../src/assets/demo/tectijuana_demo.nmea', import.meta.url), 'utf8');
  assert.equal(detectFormat('ruta.txt', text), 'nmea');
  const t = buildTracks(parseNmea(text).records).tracks[0];
  assert.equal(t.points.length, 16);
  assert.equal(t.stats.durationMs, 300_000);
  assert.equal(Math.round(t.stats.maxSpeedKmh), 47);
  assert.ok(Math.abs(t.stats.distanceKm - 5.721) < 0.01, `distancia ${t.stats.distanceKm}`);
  assert.equal(t.points[0].ele, 140);
});

test('sin sentencias válidas da error amigable', () => {
  assert.throws(() => parseNmea('hola'), GpsDataError);
});
