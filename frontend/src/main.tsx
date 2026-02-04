import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready for offline use');
  },
  onRegistered(registration) {
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      );
    }
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
