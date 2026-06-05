import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { TLayout } from './layout';
import { activationColor } from './palette';

/**
 * All neurons as a single InstancedMesh of emissive spheres. One draw call for
 * the whole network. Colors are driven per-frame from activation levels.
 */
export class Neurons {
  readonly mesh: InstancedMesh;
  private readonly offsets: number[] = [];
  private readonly scratch = new Color();

  constructor(layout: TLayout) {
    const total = layout.positions.reduce((sum, l) => sum + l.length, 0);
    const geometry = new SphereGeometry(0.35, 8, 8);
    const material = new MeshBasicMaterial({ toneMapped: false });
    this.mesh = new InstancedMesh(geometry, material, total);

    const matrix = new Matrix4();
    const pos = new Vector3();
    let i = 0;
    for (const layer of layout.positions) {
      this.offsets.push(i);
      for (const [x, y, z] of layer) {
        matrix.setPosition(pos.set(x, y, z));
        this.mesh.setMatrixAt(i, matrix);
        this.mesh.setColorAt(i, activationColor(0, this.scratch));
        i++;
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Set per-neuron glow from activation levels (already normalized to [0,1]).
   * `revealPerLayer[l]` dims a layer the wave hasn't reached; `pulsePerLayer[l]`
   * briefly brightens active neurons as the wave front passes through.
   */
  setLevels(
    levelsPerLayer: readonly (readonly number[])[],
    revealPerLayer: readonly number[],
    pulsePerLayer: readonly number[] = [],
  ): void {
    const FLASH = 0.9;
    for (let l = 0; l < levelsPerLayer.length; l++) {
      const levels = levelsPerLayer[l] ?? [];
      const reveal = revealPerLayer[l] ?? 1;
      const pulse = pulsePerLayer[l] ?? 0;
      const base = this.offsets[l] ?? 0;
      for (let n = 0; n < levels.length; n++) {
        const level = levels[n] ?? 0;
        const lit = level * reveal;
        // flash scales with the neuron's own activation, so active neurons pop
        const display = Math.min(1, lit + pulse * level * FLASH);
        activationColor(display, this.scratch);
        this.mesh.setColorAt(base + n, this.scratch);
      }
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}
