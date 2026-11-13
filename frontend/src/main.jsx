import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

const markStandalone = () => {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  document.body.classList.toggle('standalone-app', standalone);
};

markStandalone();
window.matchMedia('(display-mode: standalone)').addEventListener?.('change', markStandalone);

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
