/**
 * Tiny deterministic PRNG (mulberry32). Seedable so a given seed always
 * produces the same network — reproducible demos, no `Math.random()`.
 */
export type TRng = () => number;

export function mulberry32(seed: number): TRng {
  let a = seed >>> 0;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample from roughly N(0,1) by summing uniforms (central limit). */
export function gaussian(rng: TRng): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += rng();
  return sum - 3;
}
