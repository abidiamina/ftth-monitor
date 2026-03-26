import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { AppRouter } from '@/router/AppRouter'
import { Toaster } from 'react-hot-toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppRouter />
      <Toaster position='top-right' />
    </Provider>
  </React.StrictMode>
)