import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import '../index.css'
import App from './App'

// Analytics — PostHog. Guarded on key presence so builds without a key
// (local dev, CI) run fine with analytics simply disabled.
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    autocapture: true,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}
