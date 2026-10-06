import React from 'react';

interface State {
  hasError: boolean;
}

// The boundary wraps the whole app (including the language provider), so it reads the saved language itself
const MESSAGES: Record<string, { title: string; button: string }> = {
  en: { title: 'Something went wrong', button: 'Reload' },
  pt: { title: 'Algo deu errado', button: 'Recarregar' },
  es: { title: 'Algo salió mal', button: 'Recargar' },
  de: { title: 'Etwas ist schiefgelaufen', button: 'Neu laden' },
  zh: { title: '出了点问题', button: '重新加载' },
  ja: { title: '問題が発生しました', button: '再読み込み' },
};

const currentMessages = () => {
  try {
    const saved = localStorage.getItem('language');
    if (saved && MESSAGES[saved]) return MESSAGES[saved];
  } catch {
    // storage blocked
  }
  return MESSAGES.pt;
};

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
    const text = currentMessages();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gray-50 dark:bg-dark-bg text-gray-700 dark:text-gray-200">
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 font-bold text-white bg-linear-to-r from-red-500 to-red-600 rounded-xl shadow-lg"
        >
          {text.button}
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
