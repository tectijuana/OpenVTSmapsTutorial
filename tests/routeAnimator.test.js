import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/parsers/csvParser.js';
import { buildTracks } from '../src/utils/trackBuilder.js';
import { RouteAnimator } from '../src/animation/routeAnimator.js';

// requestAnimationFrame simulado (~60 fps) para ejecutar el reloj en Node.js.
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const track = buildTracks(parseCsv(readFileSync(new URL('../src/assets/demo/tectijuana_demo.csv', import.meta.url), 'utf8')).records).tracks[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('play avanza según la velocidad, pause detiene, reset vuelve a 0', async () => {
  const frames = [];
  const states = [];
  const a = new RouteAnimator(track, (f) => frames.push(f), (p) => states.push(p));
  assert.equal(frames.length, 1); // cuadro inicial
  a.setRate(60);
  a.play();
  await sleep(300);
  a.pause();
  const t = a.timeMs;
  assert.ok(t > 5_000 && t < 25_000, `t=${t}`); // ~0.3 s reales × 60
  assert.ok(frames.at(-1).lon > track.points[0].lon, "el vehículo se movió hacia el este");
  await sleep(100);
  assert.equal(a.timeMs, t, 'en pausa el reloj no avanza');
  a.reset();
  assert.equal(frames.at(-1).timeMs, 0);
  assert.deepEqual(states, [true, false]);
});

test('seek limita al rango y termina al llegar al final', async () => {
  const a = new RouteAnimator(track, () => {});
  a.seek(-5);
  assert.equal(a.timeMs, 0);
  a.seek(1e9);
  assert.equal(a.timeMs, a.durationMs);
  a.seek(a.durationMs - 100);
  a.setRate(60);
  a.play();
  await sleep(100);
  assert.equal(a.playing, false);
  assert.equal(a.timeMs, a.durationMs);
});
