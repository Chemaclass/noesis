import { useCallback, useEffect, useRef } from 'react';
import { canvasToInput } from '../app/preprocess';

const CANVAS_PX = 280;
const STROKE = 18;

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onInput: (input: number[]) => void;
};

/** Centered modal to draw a digit; preprocesses MNIST-style on recognize. */
export function DrawModal({ open, onClose, onInput }: Props): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const reset = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = STROKE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    dirty.current = false;
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  if (!open) return null;

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * CANVAS_PX,
      ((e.clientY - r.top) / r.height) * CANVAS_PX,
    ];
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    dirty.current = true;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = (): void => {
    drawing.current = false;
  };

  const recognize = (): void => {
    if (dirty.current && canvasRef.current) onInput(canvasToInput(canvasRef.current));
  };

  return (
    <div className="drawpad">
      <div className="drawpad-title">Draw a digit</div>
      <canvas
        ref={canvasRef}
        className="drawpad-canvas"
        width={CANVAS_PX}
        height={CANVAS_PX}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={stop}
        onPointerLeave={stop}
      />
      <div className="drawpad-controls">
        <button className="btn" onClick={recognize}>
          Recognize
        </button>
        <button className="btn" onClick={reset}>
          Clear
        </button>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
