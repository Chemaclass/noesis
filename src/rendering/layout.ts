/** A 3D position. */
export type TVec3 = readonly [number, number, number];

/** Computed geometry: one array of neuron positions per layer (input first). */
export type TLayout = {
  /** `positions[layer][neuron]` -> world-space position. */
  readonly positions: readonly (readonly TVec3[])[];
  /** Half-extent of the whole network, for camera framing. */
  readonly radius: number;
};

export type TLayoutOptions = {
  /** Distance between consecutive layers along the depth (x) axis. */
  readonly layerGap: number;
  /** Spacing between neurons within a layer's grid. */
  readonly neuronGap: number;
};

const DEFAULTS: TLayoutOptions = { layerGap: 14, neuronGap: 0.9 };

/**
 * Place each layer as a centered square grid in the Y-Z plane, layers stacked
 * along X. A 784-neuron input becomes a clean 28x28 plane (the MNIST image);
 * hidden/output layers become smaller centered grids. Pure — no Three.js — so
 * it's unit-testable.
 */
export function computeLayout(sizes: readonly number[], opts: Partial<TLayoutOptions> = {}): TLayout {
  const { layerGap, neuronGap } = { ...DEFAULTS, ...opts };
  const layerCount = sizes.length;
  const positions: TVec3[][] = [];
  let radius = layerGap;

  sizes.forEach((size, layer) => {
    const cols = Math.max(1, Math.round(Math.sqrt(size)));
    const rows = Math.ceil(size / cols);
    const x = (layer - (layerCount - 1) / 2) * layerGap;
    const halfW = ((cols - 1) * neuronGap) / 2;
    const halfH = ((rows - 1) * neuronGap) / 2;

    const layerPositions: TVec3[] = [];
    for (let n = 0; n < size; n++) {
      const c = n % cols;
      const r = Math.floor(n / cols);
      const y = halfH - r * neuronGap;
      const z = c * neuronGap - halfW;
      layerPositions.push([x, y, z]);
      radius = Math.max(radius, Math.hypot(x, y, z));
    }
    positions.push(layerPositions);
  });

  return { positions, radius };
}

/** Total neuron count across all layers. */
export function totalNeurons(sizes: readonly number[]): number {
  return sizes.reduce((sum, s) => sum + s, 0);
}
