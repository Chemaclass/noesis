// Offline MNIST trainer for noesis. Self-contained Node ESM (no deps).
// Trains a 784-64-32-10 MLP (ReLU, linear logits, softmax + cross-entropy) with
// AdamW, minibatches and light affine augmentation so it tolerates hand-drawn
// digits, then exports src/data/model.json (base64 Float32 weights + 10 samples).
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

const ARCH = [784, 64, 32, 10];
const ACTIVATIONS = ['relu', 'relu', 'linear'];
const DIM = 28;

// hyperparameters
const EPOCHS = 18;
const BATCH = 64;
const LR = 0.001;
const WD = 1e-4; // decoupled weight decay (AdamW)
const B1 = 0.9;
const B2 = 0.999;
const EPS = 1e-8;
// augmentation ranges
const AUG_ROT = 0.18; // rad (~10°)
const AUG_SCALE = 0.12;
const AUG_SHIFT = 2.0; // px

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
  const px = buf.readUInt32BE(8) * buf.readUInt32BE(12);
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

// mulberry32 PRNG (reproducible)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rnd) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const relu = (x) => (x > 0 ? x : 0);

function makeModel(rnd) {
  const W = [];
  const B = [];
  const mW = [];
  const vW = [];
  const mB = [];
  const vB = [];
  for (let l = 1; l < ARCH.length; l++) {
    const rows = ARCH[l];
    const cols = ARCH[l - 1];
    const w = new Float32Array(rows * cols);
    const scale = Math.sqrt(2 / cols);
    for (let i = 0; i < w.length; i++) w[i] = randn(rnd) * scale;
    W.push(w);
    B.push(new Float32Array(rows));
    mW.push(new Float32Array(rows * cols));
    vW.push(new Float32Array(rows * cols));
    mB.push(new Float32Array(rows));
    vB.push(new Float32Array(rows));
  }
  return { W, B, mW, vW, mB, vB };
}

function zerosLike(arrs) {
  return arrs.map((a) => new Float32Array(a.length));
}

function forward(model, x) {
  const acts = [x];
  const pre = [null];
  let cur = x;
  for (let l = 0; l < model.W.length; l++) {
    const inSize = ARCH[l];
    const outSize = ARCH[l + 1];
    const w = model.W[l];
    const b = model.B[l];
    const z = new Float32Array(outSize);
    for (let j = 0; j < outSize; j++) {
      let s = b[j];
      const base = j * inSize;
      for (let i = 0; i < inSize; i++) s += w[base + i] * cur[i];
      z[j] = s;
    }
    pre.push(z);
    const last = l === model.W.length - 1;
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

// accumulate gradients for one sample into gW/gB; returns loss
function accumulate(model, gW, gB, x, label) {
  const { acts, pre } = forward(model, x);
  const probs = softmax(acts[acts.length - 1]);
  const loss = -Math.log(Math.max(probs[label], 1e-12));

  let delta = new Float32Array(probs.length);
  for (let j = 0; j < probs.length; j++) delta[j] = probs[j] - (j === label ? 1 : 0);

  for (let l = model.W.length - 1; l >= 0; l--) {
    const inSize = ARCH[l];
    const outSize = ARCH[l + 1];
    const w = model.W[l];
    const gw = gW[l];
    const gb = gB[l];
    const aIn = acts[l];
    const nextDelta = l > 0 ? new Float32Array(inSize) : null;
    for (let j = 0; j < outSize; j++) {
      const d = delta[j];
      const base = j * inSize;
      for (let i = 0; i < inSize; i++) {
        if (nextDelta) nextDelta[i] += w[base + i] * d;
        gw[base + i] += d * aIn[i];
      }
      gb[j] += d;
    }
    if (nextDelta) {
      const zIn = pre[l];
      for (let i = 0; i < inSize; i++) nextDelta[i] *= zIn[i] > 0 ? 1 : 0;
      delta = nextDelta;
    }
  }
  return loss;
}

// AdamW update of one parameter tensor
function adamW(w, g, m, v, lr, t, scale) {
  const bc1 = 1 - Math.pow(B1, t);
  const bc2 = 1 - Math.pow(B2, t);
  for (let i = 0; i < w.length; i++) {
    const grad = g[i] * scale;
    m[i] = B1 * m[i] + (1 - B1) * grad;
    v[i] = B2 * v[i] + (1 - B2) * grad * grad;
    const mh = m[i] / bc1;
    const vh = v[i] / bc2;
    w[i] -= lr * (mh / (Math.sqrt(vh) + EPS) + WD * w[i]);
  }
}

// affine-augmented copy of a 28x28 image (rotate/scale/shift, bilinear)
function augment(src, rnd) {
  const ang = (rnd() * 2 - 1) * AUG_ROT;
  const sc = 1 + (rnd() * 2 - 1) * AUG_SCALE;
  const tx = (rnd() * 2 - 1) * AUG_SHIFT;
  const ty = (rnd() * 2 - 1) * AUG_SHIFT;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const c = (DIM - 1) / 2;
  const out = new Float32Array(DIM * DIM);
  for (let y = 0; y < DIM; y++) {
    for (let x = 0; x < DIM; x++) {
      const dx = x - c;
      const dy = y - c;
      const sx = c + (cos * dx + sin * dy) / sc - tx;
      const sy = c + (-sin * dx + cos * dy) / sc - ty;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 + 1 >= DIM || y0 + 1 >= DIM) continue;
      const fx = sx - x0;
      const fy = sy - y0;
      const i = y0 * DIM + x0;
      const v =
        src[i] * (1 - fx) * (1 - fy) +
        src[i + 1] * fx * (1 - fy) +
        src[i + DIM] * (1 - fx) * fy +
        src[i + DIM + 1] * fx * fy;
      out[y * DIM + x] = v;
    }
  }
  return out;
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
  console.log(`arch=${ARCH.join('-')} train=${trainImages.count} test=${testImages.count}`);

  const rnd = rng(42);
  const model = makeModel(rnd);
  const order = Uint32Array.from({ length: trainImages.count }, (_, i) => i);
  let t = 0;
  let best = 0;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    const lr = LR * (0.5 + 0.5 * Math.cos((Math.PI * epoch) / EPOCHS)); // cosine decay
    const t0 = Date.now();
    let loss = 0;
    const gW = zerosLike(model.W);
    const gB = zerosLike(model.B);

    for (let k = 0; k < order.length; k++) {
      const n = order[k];
      const raw = trainImages.data.subarray(n * trainImages.px, (n + 1) * trainImages.px);
      const x = augment(raw, rnd);
      loss += accumulate(model, gW, gB, x, trainLabels[n]);

      if ((k + 1) % BATCH === 0 || k === order.length - 1) {
        t++;
        const scale = 1 / BATCH;
        for (let l = 0; l < model.W.length; l++) {
          adamW(model.W[l], gW[l], model.mW[l], model.vW[l], lr, t, scale);
          adamW(model.B[l], gB[l], model.mB[l], model.vB[l], lr, t, scale);
          gW[l].fill(0);
          gB[l].fill(0);
        }
      }
    }
    const acc = evaluate(model, testImages, testLabels);
    best = Math.max(best, acc);
    console.log(
      `epoch ${String(epoch + 1).padStart(2)}/${EPOCHS}  lr=${lr.toFixed(5)}  loss=${(loss / order.length).toFixed(3)}  test=${(acc * 100).toFixed(2)}%  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }

  const testAccuracy = evaluate(model, testImages, testLabels);
  const layers = model.W.map((w, l) => ({
    size: ARCH[l + 1],
    inputSize: ARCH[l],
    activation: ACTIVATIONS[l],
    w: b64(w),
    b: b64(model.B[l]),
  }));

  // one real, correctly-classified test image per digit 0-9
  const samples = new Array(10).fill(null);
  for (let n = 0; n < testLabels.length && samples.includes(null); n++) {
    const label = testLabels[n];
    if (samples[label]) continue;
    const x = testImages.data.subarray(n * testImages.px, (n + 1) * testImages.px);
    const { acts } = forward(model, x);
    const out = acts[acts.length - 1];
    let b = 0;
    for (let j = 1; j < out.length; j++) if (out[j] > out[b]) b = j;
    if (b === label) samples[label] = b64(Float32Array.from(x));
  }

  const outObj = {
    inputSize: ARCH[0],
    layers,
    samples,
    testAccuracy: Number(testAccuracy.toFixed(4)),
  };
  writeFileSync(OUT, JSON.stringify(outObj));
  console.log(`\nwrote ${OUT}  (test acc ${(testAccuracy * 100).toFixed(2)}%, best ${(best * 100).toFixed(2)}%)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
