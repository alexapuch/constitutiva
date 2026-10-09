import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-5 border border-gray-100">
            <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Actualización del sistema disponible
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              La plataforma se ha actualizado recientemente. Haz clic en el botón de abajo para recargar la aplicación y cargar los últimos cambios.
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full bg-[#0B152A] hover:bg-[#1a2d54] text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
