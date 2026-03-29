import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 m-4">
          <div className="bg-red-100 p-4 rounded-full text-red-600 mb-6">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Something went wrong</h2>
          <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
            The application encountered an unexpected error. We've logged the details and are working to fix it.
          </p>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-left mb-8 w-full max-w-lg overflow-auto max-h-40">
            <code className="text-xs text-red-500 font-mono">
              {this.state.error?.toString()}
            </code>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <RefreshCw size={20} />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
