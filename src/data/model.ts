import type { TActivationName, TLayer, TNetwork } from '../domain/types';

/** Shape of one layer as stored in model.json (base64 Float32 weights). */
type TModelLayer = {
  readonly size: number;
  readonly inputSize: number;
  readonly activation: string;
  /** Row-major weights, length size*inputSize, index `j*inputSize + i`. */
  readonly w: string;
  /** Biases, length size. */
  readonly b: string;
};

type TModel = {
  readonly inputSize: number;
  readonly layers: readonly TModelLayer[];
  /** One real MNIST input vector (base64 Float32, len 784) per digit 0–9. */
  readonly samples: readonly string[];
  readonly testAccuracy: number;
};

let MODEL: TModel | null = null;

/** Fetch the trained weights (served as a static asset, not bundled into JS). */
export async function initModel(): Promise<void> {
  if (MODEL) return;
  const res = await fetch(`${import.meta.env.BASE_URL}model.json`);
  if (!res.ok) throw new Error(`failed to load model.json: ${res.status}`);
  MODEL = (await res.json()) as TModel;
}

function model(): TModel {
  if (!MODEL) throw new Error('model not loaded — call initModel() first');
  return MODEL;
}

/** Test-set accuracy of the trained network (0–1). */
export function modelAccuracy(): number {
  return model().testAccuracy;
}

/** Decode a base64-encoded little-endian Float32 array. */
function decodeFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/** Reshape a flat row-major buffer into `size` rows of `inputSize`. */
function toMatrix(flat: Float32Array, size: number, inputSize: number): number[][] {
  const rows: number[][] = new Array<number[]>(size);
  for (let j = 0; j < size; j++) {
    const row = new Array<number>(inputSize);
    const base = j * inputSize;
    for (let i = 0; i < inputSize; i++) row[i] = flat[base + i] ?? 0;
    rows[j] = row;
  }
  return rows;
}

/** A real MNIST handwriting sample (784-length input) for digit `d` (0–9). */
export function sampleDigit(d: number): number[] {
  const m = model();
  const b64 = m.samples[d % 10];
  return b64 ? Array.from(decodeFloat32(b64)) : new Array<number>(m.inputSize).fill(0);
}

/** Build the runtime `TNetwork` from the trained model. */
export function loadTrainedNetwork(): TNetwork {
  const m = model();
  const layers: TLayer[] = m.layers.map((layer) => ({
    size: layer.size,
    inputSize: layer.inputSize,
    activation: layer.activation as TActivationName,
    weights: toMatrix(decodeFloat32(layer.w), layer.size, layer.inputSize),
    biases: Array.from(decodeFloat32(layer.b)),
  }));
  return { inputSize: m.inputSize, layers };
}
