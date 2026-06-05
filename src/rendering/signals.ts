import type { TForwardTrace } from '../domain/types';

/** Seconds the wave's leading edge takes to advance one layer. */
const LAYER_DURATION = 0.9;
/** How many layers the ramp spans, so adjacent layers fade in overlapping. */
const RAMP = 1.6;
/** Where (in layers, behind the front) the brightness pulse peaks, and its width. */
const PULSE_OFFSET = 0.8;
const PULSE_WIDTH = 0.7;

/** Smoothstep easing for soft fade-in/out. */
function smoothstep(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

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

  private get endTime(): number {
    return (this.layerCount - 1 + RAMP) * LAYER_DURATION;
  }

  /** (Re)start the wave from the input layer. */
  play(): void {
    this.elapsed = 0;
    this.playing = true;
  }

  /** Snap to fully revealed (used by Step / when paused). */
  complete(): void {
    this.elapsed = this.endTime;
    this.playing = false;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Advance the clock; returns true on every frame it still drives a change. */
  update(dt: number): boolean {
    if (!this.playing) return false;
    this.elapsed += dt;
    if (this.elapsed >= this.endTime) {
      this.elapsed = this.endTime;
      this.playing = false;
    }
    return true; // apply this frame too, so it lands on a full reveal
  }

  /** Reveal factor per layer (input first), each eased in [0,1]. */
  reveal(): number[] {
    const front = this.elapsed / LAYER_DURATION;
    const out = new Array<number>(this.layerCount);
    for (let l = 0; l < this.layerCount; l++) {
      out[l] = smoothstep((front - l) / RAMP);
    }
    return out;
  }

  /**
   * Transient brightness boost per layer: a travelling bell that peaks as the
   * wave front crosses each layer, then decays — so the signal flashes brighter
   * as it passes. Zero when not animating (steady state).
   */
  pulse(): number[] {
    const out = new Array<number>(this.layerCount).fill(0);
    if (!this.playing) return out;
    const front = this.elapsed / LAYER_DURATION;
    for (let l = 0; l < this.layerCount; l++) {
      const d = (front - l - PULSE_OFFSET) / PULSE_WIDTH;
      out[l] = Math.exp(-d * d);
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
