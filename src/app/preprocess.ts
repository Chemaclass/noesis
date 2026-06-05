import { DIGIT_SIZE } from '../data/digits';

/**
 * Preprocess a freehand drawing the way MNIST images were made: crop to the ink,
 * scale the longest side to 20px, then translate by centre of mass so the input
 * matches the training distribution. Returns a 784-length grayscale vector.
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

  const center = DIGIT_SIZE / 2;
  const dx = center - cx * scale;
  const dy = center - cy * scale;
  tctx.drawImage(canvas, dx, dy, size * scale, size * scale);

  const px = tctx.getImageData(0, 0, DIGIT_SIZE, DIGIT_SIZE).data;
  for (let i = 0; i < out.length; i++) out[i] = (px[i * 4] ?? 0) / 255;
  return out;
}
