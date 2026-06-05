import { AdditiveBlending, Color, NormalBlending } from 'three';

export type TTheme = 'dark' | 'light';

type TThemeColors = {
  readonly cold: number;
  readonly mid: number;
  readonly hot: number;
  readonly weightPos: number;
  readonly weightNeg: number;
  readonly background: number;
  readonly bloom: number;
  readonly lineOpacity: number;
  /** Edge brightness multiplier (additive glow vs solid line). */
  readonly lineGain: number;
  readonly additive: boolean;
};

const THEMES: Record<TTheme, TThemeColors> = {
  // Dark: neon glow on near-black, additive bloom.
  dark: {
    cold: 0x05143a,
    mid: 0x18a8ff,
    hot: 0xeaffff,
    weightPos: 0x2bd6ff,
    weightNeg: 0xff3d7f,
    background: 0x03060f,
    bloom: 0.55,
    lineOpacity: 0.38,
    lineGain: 0.42,
    additive: true,
  },
  // Light: saturated ink on a soft slate, solid lines, little bloom.
  light: {
    cold: 0xb8c6d6,
    mid: 0x2f6fc4,
    hot: 0x06235c,
    weightPos: 0x1769aa,
    weightNeg: 0xc01f57,
    background: 0xdce6f0,
    bloom: 0.12,
    lineOpacity: 0.5,
    lineGain: 1.0,
    additive: false,
  },
};

let current: TThemeColors = THEMES.dark;
const COLD = new Color();
const MID = new Color();
const HOT = new Color();

function refresh(): void {
  COLD.setHex(current.cold);
  MID.setHex(current.mid);
  HOT.setHex(current.hot);
}
refresh();

export function setPaletteTheme(theme: TTheme): void {
  current = THEMES[theme];
  refresh();
}

/** Cold (inactive) → hot (firing) ramp. Mutates and returns `out`. */
export function activationColor(level: number, out: Color): Color {
  const t = level < 0 ? 0 : level > 1 ? 1 : level;
  if (t < 0.5) out.copy(COLD).lerp(MID, t * 2);
  else out.copy(MID).lerp(HOT, (t - 0.5) * 2);
  return out;
}

/** Final color for an edge given its sign and normalized magnitude (0–1). */
export function weightColor(positive: boolean, magnitude: number, out: Color): Color {
  out.setHex(positive ? current.weightPos : current.weightNeg);
  // gamma-curve so only strong weights are bright
  return out.multiplyScalar(magnitude * magnitude * current.lineGain);
}

export function lineBlending(): typeof AdditiveBlending | typeof NormalBlending {
  return current.additive ? AdditiveBlending : NormalBlending;
}

export function lineOpacity(): number {
  return current.lineOpacity;
}

export function backgroundColor(): number {
  return current.background;
}

export function bloomStrength(): number {
  return current.bloom;
}
