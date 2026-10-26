import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Toaster from './Toaster.jsx'
import { CatalogProvider } from './catalog.jsx'
import { startTheme } from './lib/theme.js'
import './styles.css'

startTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CatalogProvider>
      <App />
      <Toaster />
    </CatalogProvider>
  </StrictMode>,
)
