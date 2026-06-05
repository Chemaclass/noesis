import { DIGIT_SIZE } from '../data/digits';

const CANVAS_PX = 280; // drawing surface (10x the model resolution)
const STROKE = 18;

/**
 * A draw-your-own-digit panel. Captures strokes, then preprocesses them
 * MNIST-style (crop to ink, scale the longest side to ~20px, center by mass in a
 * 28×28 field) and hands back a 784-length input vector.
 */
export class DrawPad {
  private readonly wrap: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private drawing = false;
  private dirty = false;

  constructor(root: HTMLElement, onInput: (input: number[]) => void) {
    this.wrap = document.createElement('div');
    this.wrap.className = 'drawpad hidden';

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_PX;
    this.canvas.height = CANVAS_PX;
    this.canvas.className = 'drawpad-canvas';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.reset();

    const controls = document.createElement('div');
    controls.className = 'drawpad-controls';
    controls.append(
      button('Recognize', () => {
        if (this.dirty) onInput(this.toInput());
      }),
      button('Clear', () => this.reset()),
      button('Close', () => this.toggle(false)),
    );

    const title = document.createElement('div');
    title.className = 'drawpad-title';
    title.textContent = 'Draw a digit';

    this.wrap.append(title, this.canvas, controls);
    root.appendChild(this.wrap);
    this.bindPointer();
  }

  toggle(show?: boolean): void {
    const visible = show ?? this.wrap.classList.contains('hidden');
    this.wrap.classList.toggle('hidden', !visible);
  }

  private reset(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = STROKE;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.dirty = false;
  }

  private bindPointer(): void {
    const pos = (e: PointerEvent): [number, number] => {
      const r = this.canvas.getBoundingClientRect();
      return [
        ((e.clientX - r.left) / r.width) * CANVAS_PX,
        ((e.clientY - r.top) / r.height) * CANVAS_PX,
      ];
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      this.drawing = true;
      this.dirty = true;
      const [x, y] = pos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.drawing) return;
      const [x, y] = pos(e);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    });
    const end = (): void => {
      this.drawing = false;
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointerleave', end);
  }

  /** Preprocess the canvas into a centered 28×28 grayscale input vector. */
  private toInput(): number[] {
    const src = this.ctx.getImageData(0, 0, CANVAS_PX, CANVAS_PX).data;

    // Bounding box of the ink (red channel == luminance on grayscale).
    let minX = CANVAS_PX;
    let minY = CANVAS_PX;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < CANVAS_PX; y++) {
      for (let x = 0; x < CANVAS_PX; x++) {
        if ((src[(y * CANVAS_PX + x) * 4] ?? 0) > 32) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const out = new Array<number>(DIGIT_SIZE * DIGIT_SIZE).fill(0);
    if (maxX < minX) return out; // empty

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const scale = 20 / Math.max(bw, bh); // fit longest side into ~20px

    // Scale the cropped ink into a centered 28×28 via an offscreen canvas.
    const tmp = document.createElement('canvas');
    tmp.width = DIGIT_SIZE;
    tmp.height = DIGIT_SIZE;
    const tctx = tmp.getContext('2d');
    if (!tctx) return out;
    tctx.fillStyle = '#000';
    tctx.fillRect(0, 0, DIGIT_SIZE, DIGIT_SIZE);
    const dw = bw * scale;
    const dh = bh * scale;
    tctx.drawImage(
      this.canvas,
      minX,
      minY,
      bw,
      bh,
      (DIGIT_SIZE - dw) / 2,
      (DIGIT_SIZE - dh) / 2,
      dw,
      dh,
    );

    const px = tctx.getImageData(0, 0, DIGIT_SIZE, DIGIT_SIZE).data;
    for (let i = 0; i < out.length; i++) out[i] = (px[i * 4] ?? 0) / 255;
    return out;
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'hud-btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
