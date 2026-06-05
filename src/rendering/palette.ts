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
  // Light: saturated ink on a soft slate, solid lines fading to the background,
  // no bloom.
  light: {
    cold: 0xaab9cb,
    mid: 0x2f6fc4,
    hot: 0x06235c,
    weightPos: 0x1f6fb0,
    weightNeg: 0xcc2a5e,
    background: 0xe6edf4,
    bloom: 0.0,
    lineOpacity: 0.26,
    lineGain: 0.85,
    additive: false,
  },
};

let current: TThemeColors = THEMES.dark;
const COLD = new Color();
const MID = new Color();
const HOT = new Color();
const BG = new Color();
const POS = new Color();
const NEG = new Color();

function refresh(): void {
  COLD.setHex(current.cold);
  MID.setHex(current.mid);
  HOT.setHex(current.hot);
  BG.setHex(current.background);
  POS.setHex(current.weightPos);
  NEG.setHex(current.weightNeg);
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
  const base = positive ? POS : NEG;
  if (current.additive) {
    // Dark theme: additive glow — weak weights fade to black (invisible).
    return out.copy(base).multiplyScalar(magnitude * magnitude * current.lineGain);
  }
  // Light theme: normal blending — weak weights fade toward the background,
  // strong weights become saturated ink. Avoids the black-hairball stacking.
  const t = Math.pow(magnitude, 0.85);
  return out.copy(BG).lerp(base, t * current.lineGain);
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
