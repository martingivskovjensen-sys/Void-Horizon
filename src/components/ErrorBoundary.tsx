import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#06070d',
            color: '#f8fafc',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ color: '#ff007f', marginBottom: '1rem' }}>Game failed to load</h1>
          <pre
            style={{
              background: 'rgba(0,0,0,0.4)',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.85rem',
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
            Try clearing site data for this URL and reload. If the problem persists, check the
            browser console (F12) for failed network requests.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
