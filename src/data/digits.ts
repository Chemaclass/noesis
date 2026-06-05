/** Side length of a digit bitmap (28x28, MNIST-style). */
export const DIGIT_SIZE = 28;
export const DIGIT_PIXELS = DIGIT_SIZE * DIGIT_SIZE;

/**
 * Rasterize the glyph for digit `d` (0-9) into a 28x28 grayscale vector in
 * [0,1] using a 2D canvas. Gives real digit shapes without hand-authoring 784
 * values per digit. Browser-only (uses the DOM); the engine never imports this.
 */
export function rasterizeDigit(d: number): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = DIGIT_SIZE;
  canvas.height = DIGIT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Array<number>(DIGIT_PIXELS).fill(0);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, DIGIT_SIZE, DIGIT_SIZE);
  ctx.fillStyle = '#fff';
  ctx.font = '22px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(d % 10), DIGIT_SIZE / 2, DIGIT_SIZE / 2 + 1);

  const { data } = ctx.getImageData(0, 0, DIGIT_SIZE, DIGIT_SIZE);
  const out = new Array<number>(DIGIT_PIXELS);
  for (let i = 0; i < DIGIT_PIXELS; i++) {
    out[i] = (data[i * 4] ?? 0) / 255; // red channel == luminance on grayscale
  }
  return out;
}

/** A blank input (all zeros). */
export function blankDigit(): number[] {
  return new Array<number>(DIGIT_PIXELS).fill(0);
}
