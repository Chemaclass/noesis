import type { TForwardTrace } from '../core/types';

/** Seconds for the activation wave to sweep through one layer. */
const LAYER_DURATION = 0.45;

/**
 * Drives the "signal travels through the brain" animation. Given a forward
 * trace, it produces a per-layer reveal value in [0,1] that ramps up layer by
 * layer over time, so downstream neurons ignite only after upstream ones fire.
 */
export class SignalAnimator {
  private elapsed = 0;
  private playing = false;
  private readonly layerCount: number;

  constructor(layerCount: number) {
    // +1 so the input layer (index 0) is part of the wave.
    this.layerCount = layerCount + 1;
  }

  /** (Re)start the wave from the input layer. */
  play(): void {
    this.elapsed = 0;
    this.playing = true;
  }

  /** Snap to fully revealed (used by Step / when paused). */
  complete(): void {
    this.elapsed = this.layerCount * LAYER_DURATION;
    this.playing = false;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Advance the clock; returns true while still animating. */
  update(dt: number): boolean {
    if (!this.playing) return false;
    this.elapsed += dt;
    if (this.elapsed >= this.layerCount * LAYER_DURATION) {
      this.playing = false;
    }
    return this.playing;
  }

  /** Reveal factor per layer (input first), each in [0,1]. */
  reveal(): number[] {
    const front = this.elapsed / LAYER_DURATION;
    const out = new Array<number>(this.layerCount);
    for (let l = 0; l < this.layerCount; l++) {
      const v = front - l;
      out[l] = v <= 0 ? 0 : v >= 1 ? 1 : v;
    }
    return out;
  }
}

/**
 * Normalize a forward trace into per-layer activation levels in [0,1] for
 * coloring. Input layer uses raw pixel intensity; other layers are scaled by
 * their own max so a layer always shows contrast.
 */
export function normalizeLevels(trace: TForwardTrace): number[][] {
  const input = trace.input.map((v) => clamp01(v));
  const layers = trace.layers.map((layer) => {
    let max = 1e-6;
    for (const a of layer.a) max = Math.max(max, Math.abs(a));
    return layer.a.map((a) => clamp01(Math.abs(a) / max));
  });
  return [input, ...layers];
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
