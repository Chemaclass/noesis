import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { initModel } from './data/model';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root element');

// Load the trained weights (static asset) before mounting the app.
initModel()
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    root.textContent = `Failed to load model: ${String(err)}`;
  });
