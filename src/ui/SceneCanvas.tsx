import { useEffect, useRef } from 'react';
import type { TForwardTrace, TNetwork } from '../domain/types';
import type { TTheme } from '../rendering/palette';
import { Scene } from '../rendering/scene';

type Props = {
  readonly network: TNetwork;
  readonly trace: TForwardTrace;
  readonly animate: boolean;
  readonly nonce: number;
  readonly theme: TTheme;
  readonly onEdges: (rendered: number, total: number) => void;
};

/**
 * Bridges React to the imperative Three.js engine: owns a Scene instance, builds
 * geometry when the network changes, and plays/shows traces on each run nonce.
 */
export function SceneCanvas({ network, trace, animate, nonce, theme, onEdges }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const prevNetwork = useRef<TNetwork | null>(null);

  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return; // guard React StrictMode double-mount
    const scene = new Scene(canvasRef.current);
    sceneRef.current = scene;
    scene.start();
  }, []);

  useEffect(() => {
    sceneRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (prevNetwork.current !== network) {
      const result = scene.build(network);
      prevNetwork.current = network;
      onEdges(result.edges.rendered, result.edges.total);
    }
    if (animate) scene.play(trace);
    else scene.show(trace);
    // Intentionally keyed on `nonce` only (bumps on every run); other props are
    // read fresh each time. We don't use the react-hooks lint plugin.
  }, [nonce]);

  return <canvas ref={canvasRef} id="scene" />;
}
