import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Simple error boundary component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div style={{ 
      margin: '20px', 
      padding: '20px', 
      border: '1px solid #f56565', 
      borderRadius: '5px',
      backgroundColor: '#fff5f5' 
    }}>
      <h2 style={{ color: '#c53030' }}>Something went wrong:</h2>
      <pre style={{ 
        padding: '10px', 
        backgroundColor: '#f7fafc', 
        borderRadius: '4px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap'
      }}>
        {error.message}
      </pre>
      <button 
        onClick={() => window.location.reload()}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Reload Page
      </button>
    </div>
  );
}

// Error boundary HOC
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
