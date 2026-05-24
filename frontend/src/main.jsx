import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker for PWA only in production to avoid caching during dev
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        console.log('Service worker registered:', reg);
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

// OAuth redirect handling: some providers return tokens in the URL hash (e.g. #access_token=...)
// Supabase processes the hash on load; remove sensitive fragments from URL once present to keep UI clean.
if (typeof window !== 'undefined' && window.location && window.location.hash) {
  const hash = window.location.hash;
  const looksLikeAuthHash = /access_token=|refresh_token=|error=|type=auth/.test(hash);
  if (looksLikeAuthHash) {
    // Wait a short while for client libraries (Supabase) to process the hash, then remove it.
    setTimeout(() => {
      try {
        const clean = window.location.pathname + window.location.search;
        window.history.replaceState({}, document.title, clean);
      } catch (e) {
        // ignore
      }
    }, 800);
  } else if (hash === '#') {
    // If only a trailing hash remained, remove it immediately
    try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search); } catch (e) {}
  }
}
