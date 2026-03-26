import '@fontsource-variable/geist/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { AppRouter } from '@/router/AppRouter'
import { Toaster } from 'react-hot-toast'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AppRouter />
      <Toaster position='top-right' />
    </Provider>
  </StrictMode>
)
