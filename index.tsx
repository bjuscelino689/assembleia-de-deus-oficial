
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-purple-800/40 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-purple-600/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black shadow-lg">
              ⛪
            </div>
            <div>
              <h1 className="text-xl font-black text-white mb-2">Assembleia de Deus Nacional</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ocorreu uma pequena instabilidade ao carregar a tela. Clique abaixo para atualizar o aplicativo.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl text-left border border-slate-800 text-[11px] font-mono text-rose-400 overflow-x-auto max-h-32">
              {this.state.error?.toString() || 'Erro inesperado de renderização.'}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                🔄 Atualizar Aplicativo da Igreja
              </button>

              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('ad_chat_messages');
                  } catch (e) {}
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-all active:scale-95 cursor-pointer"
              >
                🧹 Limpar Cache Local e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

