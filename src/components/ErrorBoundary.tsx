import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Ops! Ocorreu uma instabilidade ao carregar a página.
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mb-6">
            Pode ter ocorrido um conflito temporário de cache ou conexão. Tente recarregar para continuar navegando normalmente.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Página Inicial
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
