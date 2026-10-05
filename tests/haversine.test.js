import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, bearingDeg } from '../src/utils/haversine.js';

test('un grado de latitud ≈ 111.2 km', () => {
  assert.ok(Math.abs(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) - 111.195) < 0.01);
});

test('distancia cero entre el mismo punto', () => {
  assert.equal(haversineKm({ lat: 32.5, lon: -117 }, { lat: 32.5, lon: -117 }), 0);
});

test('Tijuana → Ensenada ≈ 85 km en línea recta', () => {
  const d = haversineKm({ lat: 32.5149, lon: -117.0382 }, { lat: 31.8667, lon: -116.5964 });
  assert.ok(d > 80 && d < 90, `distancia ${d}`);
});

test('rumbos cardinales', () => {
  assert.ok(Math.abs(bearingDeg({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) - 0) < 1e-9);
  assert.ok(Math.abs(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 90) < 1e-9);
  assert.ok(Math.abs(bearingDeg({ lat: 0, lon: 0 }, { lat: -1, lon: 0 }) - 180) < 1e-9);
  assert.ok(Math.abs(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: -1 }) - 270) < 1e-9);
});
