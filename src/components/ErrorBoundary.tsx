import React, { Component } from "react";
import type { ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<
  { children: ReactNode; name?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; name?: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[Error en ${this.props.name || "App"}]`, error, errorInfo);
  }

  handleClearStorage = () => {
    localStorage.removeItem("gestion-colaciones-storage");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4 bg-red-50 rounded-lg border border-red-200 my-4">
          <div className="bg-white p-6 rounded-lg shadow-sm max-w-2xl w-full border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-red-600">
                Fallo en {this.props.name || "esta sección"}
              </h1>
            </div>

            <p className="text-gray-600 mb-4 text-sm">
              Se ha detectado un error inesperado en la aplicación de Gestión de Colaciones. Los detalles técnicos se muestran a continuación.
            </p>

            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Mensaje de Error:</p>
                <p className="text-sm font-mono text-red-700 break-all">
                  {this.state.error?.message || "Error desconocido"}
                </p>
              </div>

              {this.state.errorInfo && (
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Ubicación del fallo:</p>
                  <pre className="text-[10px] font-mono text-gray-700 overflow-auto max-h-40 leading-tight">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3 flex-wrap">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Refrescar Aplicación
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={this.handleClearStorage}
                className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded text-sm font-medium hover:bg-red-50 transition-colors ml-auto"
              >
                Limpiar datos y recargar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
