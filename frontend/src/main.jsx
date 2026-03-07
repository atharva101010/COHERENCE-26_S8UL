import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider delayDuration={0}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            className: '!bg-white !text-zinc-900 !border-zinc-200 dark:!bg-zinc-900 dark:!text-zinc-100 dark:!border-zinc-700',
          }}
        />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
