import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ignore benign Vite/WebSocket rejections inherent to the sandboxed development sandbox environment
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason);
  if (
    reason.includes('WebSocket') || 
    reason.includes('vite') || 
    reason.includes('failed to connect to websocket')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

