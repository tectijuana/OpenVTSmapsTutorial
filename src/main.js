// Punto de entrada: conecta carga de archivos, mapa, paneles y reproducción.
import { parseGpsFile } from './parsers/index.js';
import { buildTracks, GpsDataError } from './utils/trackBuilder.js';
import { formatTimelineLabel } from './utils/format.js';
import { MapController } from './map/mapController.js';
import { RouteAnimator } from './animation/routeAnimator.js';
import { setupDropZone } from './components/dropZone.js';
import { renderStats } from './components/statsPanel.js';
import { createPlaybackPanel } from './components/playbackPanel.js';
import { showMessages } from './components/notifications.js';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const DEMO_URL = 'src/assets/demo/tectijuana_demo.csv';
const SLIDER_STEPS = 1000;

const $ = (id) => document.getElementById(id);
const ui = {
  upload: $('upload'),
  dropZone: $('dropZone'),
  fileInput: $('fileInput'),
  messages: $('messages'),
  workspace: $('workspace'),
  mapWrap: $('mapWrap'),
  stats: $('stats'),
  vehicleSelectWrap: $('vehicleSelectWrap'),
  vehicleSelect: $('vehicleSelect'),
  slider: $('timeSlider'),
  timeCurrent: $('timeCurrent'),
  timeTotal: $('timeTotal'),
  simulatedNote: $('simulatedNote'),
  playBtn: $('playBtn'),
  pauseBtn: $('pauseBtn'),
  rateSelect: $('rateSelect'),
  follow: $('toggleFollow'),
};

const state = { tracks: [], track: null, animator: null, map: null, scrubbing: false };
const live = createPlaybackPanel($('live'));

// ---------- Carga de archivos ----------

async function loadFile(file) {
  try {
    if (file.size === 0) throw new GpsDataError('El archivo está vacío.');
    if (file.size > MAX_FILE_BYTES) throw new GpsDataError('El archivo supera 50 MB; divídalo en partes más pequeñas.');
    loadText(file.name, await readText(file));
  } catch (err) {
    reportError(err);
  }
}

/** Decodifica UTF-8 o UTF-16 (con BOM, como lo genera la redirección `>` de PowerShell 5). */
async function readText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes);
}

async function loadDemo() {
  try {
    const res = await fetch(DEMO_URL);
    if (!res.ok) throw new GpsDataError(`No se encontró la ruta demo (${res.status}).`);
    loadText('tectijuana_demo.csv', await res.text());
  } catch (err) {
    reportError(err instanceof TypeError ? new GpsDataError('No se pudo leer la ruta demo. Sirva la página por HTTP.') : err);
  }
}

function loadText(fileName, text) {
  const { format, records, warnings: parseWarnings } = parseGpsFile(fileName, text);
  const defaultVehicleId = fileName.replace(/\.[^.]+$/, '');
  const { tracks, warnings } = buildTracks(records, { fileName, format, defaultVehicleId });
  // Solo se reemplaza el estado si todo el procesamiento fue exitoso.
  state.tracks = tracks;
  showMessages(ui.messages, { warnings: [...parseWarnings, ...warnings] });
  populateVehicleSelect(tracks);
  showWorkspace();
  selectTrack(0);
}

function reportError(err) {
  if (!(err instanceof GpsDataError)) console.error(err);
  const message = err instanceof GpsDataError ? err.message : `Error inesperado al procesar el archivo (${err?.message ?? err}).`;
  showMessages(ui.messages, { error: message });
}

// ---------- Trayectoria activa ----------

function populateVehicleSelect(tracks) {
  ui.vehicleSelect.innerHTML = '';
  tracks.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${t.vehicleId} (${t.points.length} puntos)`;
    ui.vehicleSelect.append(opt);
  });
  ui.vehicleSelectWrap.hidden = tracks.length < 2;
}

function showWorkspace() {
  ui.workspace.hidden = false;
  ui.upload.classList.add('compact');
  if (!state.map) state.map = new MapController('map');
  state.map.invalidateSize();
}

function selectTrack(i) {
  const track = state.tracks[i];
  state.track = track;
  state.animator?.destroy();

  state.map.showTrack(track, { onPointClick: (p) => state.map.highlightPoint(p.index) });
  applyLayerToggles();
  renderStats(ui.stats, track);
  live.setVehicle(track.vehicleId);

  state.animator = new RouteAnimator(track, onFrame, onPlayStateChange);
  state.animator.setRate(Number(ui.rateSelect.value));
  ui.timeTotal.textContent = formatTimelineLabel(state.animator.durationMs);
  ui.simulatedNote.hidden = !state.animator.timeline.simulated || track.points.length < 2;
  const canPlay = track.points.length > 1;
  [ui.playBtn, ui.pauseBtn, ui.slider].forEach((el) => (el.disabled = !canPlay));
  onPlayStateChange(false);
}

function onFrame(frame) {
  state.map.updateVehicle(frame);
  if (state.animator?.playing && ui.follow.checked) state.map.keepInView(frame);
  live.update(frame);
  ui.timeCurrent.textContent = formatTimelineLabel(frame.timeMs);
  if (!state.scrubbing) {
    const d = state.animator?.durationMs ?? 0;
    ui.slider.value = d > 0 ? String(Math.round((frame.timeMs / d) * SLIDER_STEPS)) : '0';
  }
}

function onPlayStateChange(playing) {
  ui.playBtn.classList.toggle('is-active', playing);
  ui.pauseBtn.classList.toggle('is-active', !playing && (state.animator?.timeMs ?? 0) > 0);
}

// ---------- Controles ----------

function applyLayerToggles() {
  state.map.setLayerVisible('points', $('togglePoints').checked);
  state.map.setLayerVisible('route', $('toggleRoute').checked);
  state.map.setLayerVisible('labels', $('toggleLabels').checked);
}

function toggleFullscreen() {
  const el = ui.mapWrap;
  const isFull = document.fullscreenElement || document.webkitFullscreenElement;
  if (isFull) (document.exitFullscreen ?? document.webkitExitFullscreen).call(document);
  else (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
}

setupDropZone(ui.dropZone, ui.fileInput, loadFile);
$('selectBtn').addEventListener('click', () => ui.fileInput.click());
$('demoBtn').addEventListener('click', loadDemo);
ui.vehicleSelect.addEventListener('change', () => selectTrack(Number(ui.vehicleSelect.value)));

$('zoomInBtn').addEventListener('click', () => state.map.zoomIn());
$('zoomOutBtn').addEventListener('click', () => state.map.zoomOut());
$('fitBtn').addEventListener('click', () => state.map.fitRoute());
$('fullscreenBtn').addEventListener('click', toggleFullscreen);
['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) =>
  document.addEventListener(ev, () => setTimeout(() => state.map?.invalidateSize(), 100))
);

['togglePoints', 'toggleRoute', 'toggleLabels'].forEach((id) => $(id).addEventListener('change', applyLayerToggles));

ui.playBtn.addEventListener('click', () => state.animator?.play());
ui.pauseBtn.addEventListener('click', () => state.animator?.pause());
$('resetBtn').addEventListener('click', () => state.animator?.reset());
$('resetBtn2').addEventListener('click', () => state.animator?.reset());
ui.rateSelect.addEventListener('change', () => state.animator?.setRate(Number(ui.rateSelect.value)));

ui.slider.addEventListener('pointerdown', () => (state.scrubbing = true));
ui.slider.addEventListener('pointerup', () => (state.scrubbing = false));
ui.slider.addEventListener('input', () => {
  const a = state.animator;
  if (a) a.seek((Number(ui.slider.value) / SLIDER_STEPS) * a.durationMs);
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || !state.animator || e.target.closest('input, select, button, textarea')) return;
  e.preventDefault();
  state.animator.playing ? state.animator.pause() : state.animator.play();
});

// index.html?demo abre directamente la ruta de demostración (útil para clases y capturas).
if (new URLSearchParams(location.search).has('demo')) loadDemo();
