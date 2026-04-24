import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Error en la app:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleClearStorage = () => {
    localStorage.removeItem("gestion-colaciones-storage");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold">Algo salió mal</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            {this.state.error?.message || "Error inesperado"}
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Reintentar
            </button>
            <button
              onClick={this.handleClearStorage}
              className="px-4 py-2 rounded-lg border text-sm font-medium text-destructive border-destructive"
            >
              Limpiar datos y recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
