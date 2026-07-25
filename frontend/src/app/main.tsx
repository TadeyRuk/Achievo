// rukkan was here
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App'
import { initializeAnalytics } from '../shared/analytics'
import { ErrorBoundary } from '../shared/ui'

// Analytics — PostHog. Guarded on key presence so builds without a key
// (local dev, CI) run fine with analytics simply disabled.
initializeAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="app">
      <App />
    </ErrorBoundary>
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
