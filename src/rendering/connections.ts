import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { mulberry32 } from '../core/rng';
import type { TNetwork } from '../core/types';
import type { TLayout } from './layout';
import { lineBlending, lineOpacity, weightColor } from './palette';

/** Hard cap on rendered edges per layer-pair, so dense layers stay at 60fps. */
const MAX_EDGES_PER_PAIR = 4000;

export type TConnectionStats = {
  /** Edges actually drawn. */
  readonly rendered: number;
  /** Edges that exist in the network. */
  readonly total: number;
};

/**
 * The weighted connection field as additively-blended line segments. Edge
 * brightness scales with |weight| (faint threads, like the inspiration images);
 * hue encodes sign. Subsampled when a layer-pair has too many edges.
 */
/** Vertex range (in the color buffer) belonging to one layer-pair. */
type TPairRange = { readonly li: number; readonly start: number; readonly count: number };

export class Connections {
  readonly object: LineSegments;
  readonly stats: TConnectionStats;
  private readonly base: Float32Array;
  private readonly colorAttr: Float32BufferAttribute;
  private readonly ranges: TPairRange[] = [];

  constructor(network: TNetwork, layout: TLayout) {
    const verts: number[] = [];
    const colors: number[] = [];
    const rng = mulberry32(99);
    const edgeColor = new Color();
    let rendered = 0;
    let total = 0;

    // Find a normalizing scale so the strongest weight maps to full brightness.
    let maxAbs = 1e-6;
    for (const layer of network.layers) {
      for (const row of layer.weights) {
        for (const w of row) maxAbs = Math.max(maxAbs, Math.abs(w));
      }
    }

    network.layers.forEach((layer, li) => {
      const fromPos = layout.positions[li]; // input plane is layer 0
      const toPos = layout.positions[li + 1];
      if (!fromPos || !toPos) return;

      const startVert = verts.length / 3;
      const pairTotal = layer.size * layer.inputSize;
      total += pairTotal;
      const keepProb = Math.min(1, MAX_EDGES_PER_PAIR / pairTotal);

      for (let j = 0; j < layer.size; j++) {
        const row = layer.weights[j] ?? [];
        const to = toPos[j];
        if (!to) continue;
        for (let i = 0; i < layer.inputSize; i++) {
          if (rng() > keepProb) continue;
          const from = fromPos[i];
          if (!from) continue;
          const w = row[i] ?? 0;
          const mag = Math.min(1, Math.abs(w) / maxAbs);
          weightColor(w >= 0, mag, edgeColor);

          verts.push(from[0], from[1], from[2], to[0], to[1], to[2]);
          colors.push(
            edgeColor.r, edgeColor.g, edgeColor.b,
            edgeColor.r, edgeColor.g, edgeColor.b,
          );
          rendered++;
        }
      }
      const endVert = verts.length / 3;
      this.ranges.push({ li, start: startVert, count: endVert - startVert });
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(verts, 3));
    this.colorAttr = new Float32BufferAttribute(colors, 3);
    geometry.setAttribute('color', this.colorAttr);
    this.base = Float32Array.from(colors);
    const material = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: lineOpacity(),
      blending: lineBlending(),
      depthWrite: false,
      toneMapped: false,
    });

    this.object = new LineSegments(geometry, material);
    this.stats = { rendered, total };
  }

  /**
   * Brighten each layer-pair's edges as the wave front crosses it. `pulse` is the
   * per-layer bell (length = layers + 1); a pair li uses the mean of its two
   * endpoint layers. Pulse 0 restores the baked base colors.
   */
  setPulse(pulse: readonly number[]): void {
    const GAIN = 1.8;
    const arr = this.colorAttr.array as Float32Array;
    for (const { li, start, count } of this.ranges) {
      const p = ((pulse[li] ?? 0) + (pulse[li + 1] ?? 0)) / 2;
      const f = 1 + p * GAIN;
      const end = (start + count) * 3;
      for (let k = start * 3; k < end; k++) arr[k] = (this.base[k] ?? 0) * f;
    }
    this.colorAttr.needsUpdate = true;
  }

  dispose(): void {
    this.object.geometry.dispose();
    (this.object.material as LineBasicMaterial).dispose();
  }
}
