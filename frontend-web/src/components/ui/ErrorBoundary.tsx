import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center border border-slate-100">
            <div className="h-20 w-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="h-10 w-10 text-rose-500" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">Oups ! Une erreur est survenue</h1>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              L'application a rencontré un problème inattendu. Nous vous conseillons de rafraîchir la page.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-3 py-5 bg-slate-950 text-white rounded-[1.8rem] text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <RotateCcw className="h-5 w-5" />
              Recharger l'application
            </button>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-left overflow-auto max-h-40 border border-slate-100">
                <p className="text-[10px] font-mono text-rose-600 break-all">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
