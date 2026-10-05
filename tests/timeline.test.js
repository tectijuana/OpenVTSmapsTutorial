import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/parsers/csvParser.js';
import { buildTracks } from '../src/utils/trackBuilder.js';
import { buildTimeline, frameAt, segmentAt, UNIFORM_INTERVAL_MS } from '../src/animation/timeline.js';

const demoTrack = () =>
  buildTracks(parseCsv(readFileSync(new URL('../src/assets/demo/tectijuana_demo.csv', import.meta.url), 'utf8')).records)
    .tracks[0];

test('timeline con timestamps reales', () => {
  const tl = buildTimeline(demoTrack());
  assert.equal(tl.simulated, false);
  assert.equal(tl.durationMs, 300_000);
  assert.equal(tl.offsets[4], 80_000);
});

test('frame en el punto 5 coincide con el panel de ejemplo', () => {
  const f = frameAt(buildTimeline(demoTrack()), 80_000);
  assert.equal(f.lat.toFixed(6), '32.530300');
  assert.equal(f.lon.toFixed(6), '-116.970500');
  assert.equal(f.speedKmh, 42);
  assert.equal(f.clock.getHours(), 18);
  assert.equal(f.clock.getMinutes(), 1);
  assert.equal(f.clock.getSeconds(), 20);
  assert.equal(f.reached, 5);
  assert.equal(f.total, 16);
});

test('interpola a mitad de segmento y rumbo hacia el este', () => {
  const f = frameAt(buildTimeline(demoTrack()), 10_000);
  assert.ok(f.lon > -116.98819 && f.lon < -116.9838);
  assert.ok(f.bearing > 80 && f.bearing < 90);
  assert.equal(f.speedKmh, 9);
});

test('sin timestamps usa intervalos uniformes', () => {
  const track = { hasTimestamps: false, points: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }] };
  const tl = buildTimeline(track);
  assert.equal(tl.simulated, true);
  assert.equal(tl.durationMs, 2 * UNIFORM_INTERVAL_MS);
  assert.equal(frameAt(tl, 1e12).finished, true);
});

test('segmentAt: búsqueda binaria', () => {
  const offs = [0, 10, 20, 30];
  assert.equal(segmentAt(offs, 0), 0);
  assert.equal(segmentAt(offs, 15), 1);
  assert.equal(segmentAt(offs, 30), 2);
});
