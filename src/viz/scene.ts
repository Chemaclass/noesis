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
import {
  type TTheme,
  backgroundColor,
  bloomStrength,
  setPaletteTheme,
} from './palette';

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
  private readonly bloom: UnrealBloomPass;

  private neurons: Neurons | null = null;
  private connections: Connections | null = null;
  private network: TNetwork | null = null;
  private trace: TForwardTrace | null = null;
  private animator = new SignalAnimator(0);
  private levels: number[][] = [];

  private lastTime = 0;
  /** Center of the input plane (the digit "face") — the camera's look-at target. */
  private readonly faceCenter = new Vector3();
  /** Radius of the input plane, and of the whole network. */
  private inputRadius = 14;
  private netRadius = 30;
  /** Camera direction: nearly head-on to the input plane, with a slight tilt. */
  private readonly viewDir = new Vector3(-1, 0.07, 0.12).normalize();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.scene.background = new Color(backgroundColor());

    this.camera = new PerspectiveCamera(50, 1, 0.1, 4000);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    // Start framed on the digit face, then slowly orbit to reveal the network.
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    const renderPass = new RenderPass(this.scene, this.camera);
    // Modest bloom: only the brightest (firing neurons) blooms, not every line.
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), bloomStrength(), 0.5, 0.22);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloom);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Tear down the old view (if any) and build geometry for `network`. */
  build(network: TNetwork): TBuildResult {
    const result = this.rebuildView(network);
    this.frameCamera();
    return result;
  }

  /** Recreate neuron/connection geometry without touching the camera. */
  private rebuildView(network: TNetwork): TBuildResult {
    this.disposeView();
    this.network = network;

    const sizes = [network.inputSize, ...network.layers.map((l) => l.size)];
    const layout = computeLayout(sizes);
    this.netRadius = layout.radius;

    // Measure the input plane (layer 0): its center on x and its in-plane radius.
    const inputLayer = layout.positions[0] ?? [];
    let ir = 1;
    const cx = inputLayer[0]?.[0] ?? 0;
    for (const [, y, z] of inputLayer) ir = Math.max(ir, Math.hypot(y, z));
    this.faceCenter.set(cx, 0, 0);
    this.inputRadius = ir;

    this.neurons = new Neurons(layout);
    this.connections = new Connections(network, layout);
    this.scene.add(this.connections.object, this.neurons.mesh);

    this.animator = new SignalAnimator(network.layers.length);
    return { sizes, edges: this.connections.stats };
  }

  /** Switch light/dark theme: re-tint scene, bloom, palette and geometry. */
  setTheme(theme: TTheme): void {
    setPaletteTheme(theme);
    (this.scene.background as Color).setHex(backgroundColor());
    this.bloom.strength = bloomStrength();
    if (this.network) {
      this.rebuildView(this.network); // colors are baked into geometry
      if (this.trace) this.show(this.trace);
    }
  }

  /** Load a trace and animate the signal sweeping through the layers. */
  play(trace: TForwardTrace): void {
    this.trace = trace;
    this.levels = normalizeLevels(trace);
    this.animator.play();
  }

  /** Load a trace and reveal it fully at once. */
  show(trace: TForwardTrace): void {
    this.trace = trace;
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

  /** Frame the camera head-on to the input plane (the digit "face"). */
  private frameCamera(): void {
    this.controls.target.copy(this.faceCenter);
    this.fitCamera();
  }

  /** Distance that fits a sphere of `radius` within the narrower of the two FOVs. */
  private fitDistance(radius: number): number {
    const vHalf = MathUtils.degToRad(this.camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    const minHalf = Math.min(vHalf, hHalf);
    return (radius / Math.sin(minHalf)) * 1.12;
  }

  /** Place the camera facing the input plane, framing the digit. */
  private fitCamera(): void {
    const dist = this.fitDistance(this.inputRadius);
    this.camera.position.copy(this.viewDir).multiplyScalar(dist).add(this.controls.target);
    this.controls.minDistance = dist * 0.4;
    // allow zooming out far enough to see the whole network from any angle
    this.controls.maxDistance = this.fitDistance(this.netRadius) * 1.8;
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
