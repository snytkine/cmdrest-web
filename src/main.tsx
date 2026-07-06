/**
 * Application entry point: mounts the React tree into `#root` and wires
 * up the browser-history router. Also logs application start-up through
 * the logging framework.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { getLogger } from './logging';
import './styles/global.css';

const log = getLogger('bootstrap');

// The root element is declared in index.html; failing loudly here is
// better than rendering nothing silently.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

log.info('CmdRest website starting');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
