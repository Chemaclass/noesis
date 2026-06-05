import { DIGIT_SIZE } from '../data/digits';

/** Largest absolute horizontal shear we trust; beyond this the moments are noise. */
const MAX_SHEAR = 0.6;

/**
 * Preprocess a freehand drawing the way MNIST images were made: crop to the ink,
 * deskew it upright via image moments, scale the longest side to 20px, then
 * translate by centre of mass so the input matches the training distribution.
 * The crop + centre + deskew make placement and slant irrelevant — only the
 * stroke shape reaches the network. Returns a 784-length grayscale vector.
 */
export function canvasToInput(canvas: HTMLCanvasElement): number[] {
  const size = canvas.width;
  const out = new Array<number>(DIGIT_SIZE * DIGIT_SIZE).fill(0);
  const ctx = canvas.getContext('2d');
  if (!ctx) return out;
  const src = ctx.getImageData(0, 0, size, size).data;

  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;
  let sum = 0;
  let cx = 0;
  let cy = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = src[(y * size + x) * 4] ?? 0;
      if (v > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sum += v;
        cx += x * v;
        cy += y * v;
      }
    }
  }
  if (maxX < minX || sum === 0) return out; // empty

  cx /= sum;
  cy /= sum;

  // Second pass: central moments → horizontal shear that stands the digit
  // upright (classic MNIST deskew). shear = mu11 / mu02.
  let mu11 = 0;
  let mu02 = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = src[(y * size + x) * 4] ?? 0;
      if (v > 24) {
        mu11 += (x - cx) * (y - cy) * v;
        mu02 += (y - cy) * (y - cy) * v;
      }
    }
  }
  const shear = mu02 > 1e-3 ? Math.max(-MAX_SHEAR, Math.min(MAX_SHEAR, mu11 / mu02)) : 0;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const scale = 20 / Math.max(bw, bh);

  const tmp = document.createElement('canvas');
  tmp.width = DIGIT_SIZE;
  tmp.height = DIGIT_SIZE;
  const tctx = tmp.getContext('2d');
  if (!tctx) return out;
  tctx.imageSmoothingEnabled = true;
  tctx.fillStyle = '#000';
  tctx.fillRect(0, 0, DIGIT_SIZE, DIGIT_SIZE);

  // Single affine mapping source → dest: deskew, scale, then place the centre
  // of mass at the field centre. For a source pixel (sx, sy):
  //   x' = scale·sx − scale·shear·sy + (scale·shear·cy + center − scale·cx)
  //   y' = scale·sy + (center − scale·cy)
  const center = DIGIT_SIZE / 2;
  const a = scale;
  const c = -scale * shear;
  const e = scale * shear * cy + center - scale * cx;
  const d = scale;
  const f = center - scale * cy;
  tctx.setTransform(a, 0, c, d, e, f);
  tctx.drawImage(canvas, 0, 0);

  const px = tctx.getImageData(0, 0, DIGIT_SIZE, DIGIT_SIZE).data;
  for (let i = 0; i < out.length; i++) out[i] = (px[i * 4] ?? 0) / 255;
  return out;
}
