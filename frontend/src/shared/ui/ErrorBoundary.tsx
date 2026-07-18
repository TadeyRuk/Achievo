import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  name: string;
  children: ReactNode;
};

type State = { error: Error | null };

/** Isolates render failures so one tab cannot white-screen the shell. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-4 my-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">This panel failed to load</p>
          <p className="mt-1 opacity-80">{this.props.name}</p>
          <button
            type="button"
            className="mt-3 text-xs font-medium underline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
