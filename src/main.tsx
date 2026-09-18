import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import './index.css'
import App from './App.tsx'

// The service worker adds isolation headers; the first controlled load needs one reload to get them.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      if (!crossOriginIsolated && !sessionStorage.getItem('coiReload')) {
        sessionStorage.setItem('coiReload', '1')
        window.location.reload()
      }
    } catch {
      /* ignore */
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
