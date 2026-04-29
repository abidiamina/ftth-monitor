import '@fontsource-variable/geist/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { AuthBootstrap } from '@/components/auth/AuthBootstrap'
import { store } from '@/store'
import { AppRouter } from '@/router/AppRouter'
import { Toaster } from 'react-hot-toast'
import './index.css'

import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <AuthBootstrap />
        <AppRouter />
        <Toaster position='top-right' />
      </Provider>
    </ErrorBoundary>
  </StrictMode>
)
