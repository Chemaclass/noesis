import {
  ACESFilmicToneMapping,
  Color,
  MathUtils,
  PerspectiveCamera,
  Scene as ThreeScene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { TForwardTrace, TNetwork } from '../core/types';
import { computeLayout } from './layout';
import { Connections, type TConnectionStats } from './connections';
import { Neurons } from './neurons';
import { SignalAnimator, normalizeLevels } from './signals';

/** Result of (re)building the network view — fed into the HUD. */
export type TBuildResult = {
  readonly sizes: readonly number[];
  readonly edges: TConnectionStats;
};

/**
 * Owns the WebGL stack (renderer, camera, bloom) and the current network view.
 * Pure rendering concerns; the engine and HUD live elsewhere.
 */
export class Scene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new ThreeScene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;

  private neurons: Neurons | null = null;
  private connections: Connections | null = null;
  private animator = new SignalAnimator(0);
  private levels: number[][] = [];

  private lastTime = 0;
  private viewRadius = 30;
  /** Normalized view direction (camera sits along this from the target). */
  private readonly viewDir = new Vector3(0.85, 0.4, 1).normalize();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.scene.background = new Color(0x03060f);

    this.camera = new PerspectiveCamera(50, 1, 0.1, 4000);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;

    const renderPass = new RenderPass(this.scene, this.camera);
    // Modest bloom: only the brightest (firing neurons) blooms, not every line.
    const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.5, 0.22);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloom);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Tear down the old view (if any) and build geometry for `network`. */
  build(network: TNetwork): TBuildResult {
    this.disposeView();

    const sizes = [network.inputSize, ...network.layers.map((l) => l.size)];
    const layout = computeLayout(sizes);

    this.neurons = new Neurons(layout);
    this.connections = new Connections(network, layout);
    this.scene.add(this.connections.object, this.neurons.mesh);

    this.animator = new SignalAnimator(network.layers.length);
    this.frameCamera(layout.radius);

    return { sizes, edges: this.connections.stats };
  }

  /** Load a trace and animate the signal sweeping through the layers. */
  play(trace: TForwardTrace): void {
    this.levels = normalizeLevels(trace);
    this.animator.play();
  }

  /** Load a trace and reveal it fully at once. */
  show(trace: TForwardTrace): void {
    this.levels = normalizeLevels(trace);
    this.animator.complete();
    this.applyLevels();
  }

  resetCamera(): void {
    this.controls.reset();
  }

  start(): void {
    const loop = (time: number): void => {
      const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
      this.lastTime = time;
      this.controls.update();
      if (this.animator.update(dt)) this.applyLevels();
      this.composer.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private applyLevels(): void {
    if (!this.neurons) return;
    this.neurons.setLevels(this.levels, this.animator.reveal());
  }

  private frameCamera(radius: number): void {
    this.viewRadius = radius;
    this.controls.target.set(0, 0, 0);
    this.fitCamera();
  }

  /** Distance that fits the bounding sphere within the narrower of the two FOVs. */
  private fitDistance(): number {
    const vHalf = MathUtils.degToRad(this.camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    const minHalf = Math.min(vHalf, hHalf);
    return (this.viewRadius / Math.sin(minHalf)) * 1.12;
  }

  /** Place the camera along the fixed view direction at the fitting distance. */
  private fitCamera(): void {
    const dist = this.fitDistance();
    this.camera.position.copy(this.viewDir).multiplyScalar(dist).add(this.controls.target);
    this.controls.minDistance = dist * 0.45;
    this.controls.maxDistance = dist * 2.5;
    this.controls.update();
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.fitCamera(); // keep the network framed on any aspect ratio
  }

  private disposeView(): void {
    if (this.connections) {
      this.scene.remove(this.connections.object);
      this.connections.dispose();
      this.connections = null;
    }
    if (this.neurons) {
      this.scene.remove(this.neurons.mesh);
      this.neurons.dispose();
      this.neurons = null;
    }
  }
}
