// Reloj de reproducción con requestAnimationFrame sobre una línea de tiempo.
import { buildTimeline, frameAt } from './timeline.js';

export class RouteAnimator {
  /**
   * @param {object} track trayectoria del modelo interno
   * @param {(frame:object) => void} onFrame se llama en cada cuadro y en cada seek
   * @param {(playing:boolean) => void} [onStateChange]
   */
  constructor(track, onFrame, onStateChange = () => {}) {
    this.timeline = buildTimeline(track);
    this.onFrame = onFrame;
    this.onStateChange = onStateChange;
    this.rate = 1;
    this.timeMs = 0;
    this.playing = false;
    this._raf = null;
    this._last = null;
    this._tick = this._tick.bind(this);
    this.emit();
  }

  get durationMs() {
    return this.timeline.durationMs;
  }

  play() {
    if (this.playing || this.timeline.points.length < 2) return;
    if (this.timeMs >= this.durationMs) this.timeMs = 0;
    this.playing = true;
    this._last = null;
    this._raf = requestAnimationFrame(this._tick);
    this.onStateChange(true);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this._raf);
    this.onStateChange(false);
  }

  reset() {
    this.pause();
    this.seek(0);
  }

  seek(ms) {
    this.timeMs = Math.min(Math.max(ms, 0), this.durationMs);
    this.emit();
  }

  setRate(rate) {
    this.rate = rate > 0 ? rate : 1;
  }

  destroy() {
    this.pause();
    this.onFrame = () => {};
  }

  emit() {
    this.onFrame(frameAt(this.timeline, this.timeMs));
  }

  _tick(now) {
    if (!this.playing) return;
    if (this._last !== null) {
      // Δt se limita para que una pestaña en segundo plano no haga saltar al vehículo.
      const dt = Math.min(now - this._last, 250);
      this.timeMs = Math.min(this.timeMs + dt * this.rate, this.durationMs);
    }
    this._last = now;
    this.emit();
    if (this.timeMs >= this.durationMs) {
      this.pause();
      return;
    }
    this._raf = requestAnimationFrame(this._tick);
  }
}
