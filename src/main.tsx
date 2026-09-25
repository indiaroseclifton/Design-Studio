import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts'
import './index.css'
import App from './App.tsx'
import { useDesignStore } from './store/designStore'
import * as designOps from './lib/designOps'
import { liveScene, renderStill } from './lib/capture'

// Dev-only handle for browser automation and debugging; stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { __studio: { store: useDesignStore, ops: designOps, scene: liveScene, still: renderStill } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
