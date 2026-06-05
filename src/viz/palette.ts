import { Color } from 'three';

/** Cold (inactive) → hot (firing) ramp: deep blue → cyan → near-white. */
const COLD = new Color(0x05143a);
const MID = new Color(0x18a8ff);
const HOT = new Color(0xeaffff);

/** Map an activation level in [0,1] to a glow color. Mutates and returns `out`. */
export function activationColor(level: number, out: Color): Color {
  const t = level < 0 ? 0 : level > 1 ? 1 : level;
  if (t < 0.5) {
    out.copy(COLD).lerp(MID, t * 2);
  } else {
    out.copy(MID).lerp(HOT, (t - 0.5) * 2);
  }
  return out;
}

/** Positive weights lean cyan, negative weights lean magenta — sign at a glance. */
export const WEIGHT_POSITIVE = new Color(0x2bd6ff);
export const WEIGHT_NEGATIVE = new Color(0xff3d7f);
