// Offline MNIST trainer for noesis. Self-contained Node ESM (no deps).
// Downloads MNIST, trains a 784-48-24-10 MLP (relu, linear logits, softmax+CE),
// and exports src/data/model.json (base64 Float32 weights) for the app to load.
//
// Run: node scripts/train.mjs
import { gunzipSync } from 'node:zlib';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = join(__dirname, '.cache');
const OUT = join(__dirname, '..', 'src', 'data', 'model.json');
const BASE = 'https://storage.googleapis.com/cvdf-datasets/mnist/';

const FILES = {
  trainImages: 'train-images-idx3-ubyte.gz',
  trainLabels: 'train-labels-idx1-ubyte.gz',
  testImages: 't10k-images-idx3-ubyte.gz',
  testLabels: 't10k-labels-idx1-ubyte.gz',
};

async function fetchGz(name) {
  mkdirSync(CACHE, { recursive: true });
  const path = join(CACHE, name);
  if (existsSync(path)) return gunzipSync(readFileSync(path));
  process.stdout.write(`downloading ${name} ... `);
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`fetch ${name}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  console.log('ok');
  return gunzipSync(buf);
}

function parseImages(buf) {
  const count = buf.readUInt32BE(4);
  const rows = buf.readUInt32BE(8);
  const cols = buf.readUInt32BE(12);
  const px = rows * cols;
  const data = new Float32Array(count * px);
  for (let i = 0; i < count * px; i++) data[i] = buf[16 + i] / 255;
  return { count, px, data };
}

function parseLabels(buf) {
  const count = buf.readUInt32BE(4);
  const labels = new Uint8Array(count);
  for (let i = 0; i < count; i++) labels[i] = buf[8 + i];
  return labels;
}

// --- tiny MLP ---------------------------------------------------------------
const ARCH = [784, 48, 24, 10];

// standard normal via Box-Muller
function randn(rnd) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function heInit(rows, cols, rnd) {
  const w = new Float32Array(rows * cols);
  const scale = Math.sqrt(2 / cols); // He: Var = 2/fan_in
  for (let i = 0; i < w.length; i++) w[i] = randn(rnd) * scale;
  return w;
}

// mulberry32 so a run is reproducible
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function relu(x) {
  return x > 0 ? x : 0;
}

function main() {
  const rnd = rng(42);
  const W = [];
  const B = [];
  for (let l = 1; l < ARCH.length; l++) {
    W.push(heInit(ARCH[l], ARCH[l - 1], rnd));
    B.push(new Float32Array(ARCH[l]));
  }

  return { W, B, rnd };
}

function forward(model, x) {
  const { W, B } = model;
  const acts = [x];
  const pre = [null];
  let cur = x;
  for (let l = 0; l < W.length; l++) {
    const inSize = ARCH[l];
    const outSize = ARCH[l + 1];
    const w = W[l];
    const b = B[l];
    const z = new Float32Array(outSize);
    for (let j = 0; j < outSize; j++) {
      let s = b[j];
      const base = j * inSize;
      for (let i = 0; i < inSize; i++) s += w[base + i] * cur[i];
      z[j] = s;
    }
    pre.push(z);
    const last = l === W.length - 1;
    const a = new Float32Array(outSize);
    for (let j = 0; j < outSize; j++) a[j] = last ? z[j] : relu(z[j]);
    acts.push(a);
    cur = a;
  }
  return { acts, pre };
}

function softmax(logits) {
  let max = -Infinity;
  for (const v of logits) max = Math.max(max, v);
  let sum = 0;
  const out = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

function trainStep(model, x, label, lr) {
  const { W, B } = model;
  const { acts, pre } = forward(model, x);
  const probs = softmax(acts[acts.length - 1]);
  const loss = -Math.log(Math.max(probs[label], 1e-12));

  // output gradient: softmax + cross-entropy => (p - onehot)
  let delta = new Float32Array(probs.length);
  for (let j = 0; j < probs.length; j++) delta[j] = probs[j] - (j === label ? 1 : 0);

  // backprop through layers
  for (let l = W.length - 1; l >= 0; l--) {
    const inSize = ARCH[l];
    const outSize = ARCH[l + 1];
    const w = W[l];
    const b = B[l];
    const aIn = acts[l];
    const nextDelta = l > 0 ? new Float32Array(inSize) : null;

    for (let j = 0; j < outSize; j++) {
      const d = delta[j];
      const base = j * inSize;
      for (let i = 0; i < inSize; i++) {
        if (nextDelta) nextDelta[i] += w[base + i] * d;
        w[base + i] -= lr * d * aIn[i];
      }
      b[j] -= lr * d;
    }

    if (nextDelta) {
      const zIn = pre[l]; // pre-activation of layer l (relu input)
      for (let i = 0; i < inSize; i++) nextDelta[i] *= zIn[i] > 0 ? 1 : 0;
      delta = nextDelta;
    }
  }
  return loss;
}

function evaluate(model, images, labels) {
  let correct = 0;
  for (let n = 0; n < labels.length; n++) {
    const x = images.data.subarray(n * images.px, (n + 1) * images.px);
    const { acts } = forward(model, x);
    const out = acts[acts.length - 1];
    let best = 0;
    for (let j = 1; j < out.length; j++) if (out[j] > out[best]) best = j;
    if (best === labels[n]) correct++;
  }
  return correct / labels.length;
}

function b64(f32) {
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength).toString('base64');
}

const ACTIVATIONS = ['relu', 'relu', 'linear'];

async function run() {
  const [trI, trL, teI, teL] = await Promise.all([
    fetchGz(FILES.trainImages),
    fetchGz(FILES.trainLabels),
    fetchGz(FILES.testImages),
    fetchGz(FILES.testLabels),
  ]);
  const trainImages = parseImages(trI);
  const trainLabels = parseLabels(trL);
  const testImages = parseImages(teI);
  const testLabels = parseLabels(teL);
  console.log(`train=${trainImages.count} test=${testImages.count}`);

  const model = main();
  const order = Uint32Array.from({ length: trainImages.count }, (_, i) => i);
  const EPOCHS = 15;
  let lr = 0.02;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    // shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(model.rnd() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    const t0 = Date.now();
    let loss = 0;
    for (let k = 0; k < order.length; k++) {
      const n = order[k];
      const x = trainImages.data.subarray(n * trainImages.px, (n + 1) * trainImages.px);
      loss += trainStep(model, x, trainLabels[n], lr);
    }
    const acc = evaluate(model, testImages, testLabels);
    console.log(
      `epoch ${String(epoch + 1).padStart(2)}/${EPOCHS}  lr=${lr.toFixed(4)}  loss=${(loss / order.length).toFixed(3)}  test=${(acc * 100).toFixed(2)}%  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
    lr *= 0.92;
  }

  const testAccuracy = evaluate(model, testImages, testLabels);
  const layers = model.W.map((w, l) => ({
    size: ARCH[l + 1],
    inputSize: ARCH[l],
    activation: ACTIVATIONS[l],
    w: b64(w),
    b: b64(model.B[l]),
  }));

  // One real, correctly-classified test image per digit 0-9, so the preset
  // buttons show genuine handwriting the model recognizes (not a font glyph).
  const samples = new Array(10).fill(null);
  for (let n = 0; n < testLabels.length && samples.includes(null); n++) {
    const label = testLabels[n];
    if (samples[label]) continue;
    const x = testImages.data.subarray(n * testImages.px, (n + 1) * testImages.px);
    const { acts } = forward(model, x);
    const out = acts[acts.length - 1];
    let best = 0;
    for (let j = 1; j < out.length; j++) if (out[j] > out[best]) best = j;
    if (best === label) samples[label] = b64(Float32Array.from(x));
  }

  const out = {
    inputSize: ARCH[0],
    layers,
    samples,
    testAccuracy: Number(testAccuracy.toFixed(4)),
  };
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`wrote ${OUT}  (test acc ${(testAccuracy * 100).toFixed(2)}%)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
