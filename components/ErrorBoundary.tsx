import React from 'react';

interface State {
  hasError: boolean;
}

// Shows a recovery screen instead of a blank page when a render error happens
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gray-50 dark:bg-dark-bg text-gray-700 dark:text-gray-200">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 font-bold text-white bg-linear-to-r from-red-500 to-red-600 rounded-xl shadow-lg"
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
