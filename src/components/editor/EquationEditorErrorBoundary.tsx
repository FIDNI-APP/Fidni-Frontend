import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for equation-editor-react to handle React version incompatibility
 */
class EquationEditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('EquationEditor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          color: '#856404'
        }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ Compatibility Issue Detected
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            The <code>equation-editor-react</code> package encountered an error due to React version incompatibility.
          </p>
          <div style={{
            background: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <strong>Issue:</strong>
            <ul style={{ marginBottom: 0, paddingLeft: '1.5rem' }}>
              <li><code>equation-editor-react</code> requires React ^16.0.0</li>
              <li>Your project uses React 19.2.0</li>
              <li>The package is unmaintained (last updated 4+ years ago)</li>
            </ul>
          </div>
          <div style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <strong>Recommendations:</strong>
            <ol style={{ marginBottom: 0, paddingLeft: '1.5rem', lineHeight: 1.8 }}>
              <li><strong>Keep your current TipTap setup</strong> - It's well-integrated, feature-rich, and maintained</li>
              <li>Consider <strong>react-mathquill</strong> or <strong>mathlive</strong> as modern alternatives if simplification is needed</li>
              <li>Your TipTap + KaTeX implementation already provides excellent math editing capabilities</li>
            </ol>
          </div>
          {this.state.error && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Technical Details
              </summary>
              <pre style={{
                background: '#f8f9fa',
                padding: '0.5rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                overflow: 'auto',
                marginTop: '0.5rem'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default EquationEditorErrorBoundary;
