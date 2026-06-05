import { useEffect, useState } from 'react';
import { useNoesis } from '../app/useNoesis';
import { ControlPanel } from './ControlPanel';
import { DrawModal } from './DrawModal';
import { InfoPanel } from './InfoPanel';
import { SceneCanvas } from './SceneCanvas';

export function App(): JSX.Element {
  const noesis = useNoesis();
  const [drawOpen, setDrawOpen] = useState(false);

  // Reflect the theme on <html> for the CSS variables.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', noesis.theme);
  }, [noesis.theme]);

  return (
    <>
      <SceneCanvas
        network={noesis.session.network}
        trace={noesis.session.trace}
        animate={noesis.session.animate}
        nonce={noesis.session.nonce}
        theme={noesis.theme}
        onEdges={noesis.setEdges}
      />
      <InfoPanel
        layers={noesis.derived.layers}
        activation={noesis.session.hiddenActivation}
        accuracy={noesis.derived.accuracy}
      />
      <ControlPanel noesis={noesis} onOpenDraw={() => setDrawOpen(true)} />
      <DrawModal
        open={drawOpen}
        onClose={() => setDrawOpen(false)}
        onInput={(input) => noesis.draw(input)}
      />
    </>
  );
}
