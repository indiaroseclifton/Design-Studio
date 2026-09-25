import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useDesignStore } from './store/designStore'
import * as designOps from './lib/designOps'
import { liveScene } from './lib/capture'

// Dev-only handle for browser automation and debugging; stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { __studio: { store: useDesignStore, ops: designOps, scene: liveScene } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
