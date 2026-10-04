import React from 'react';

interface Props {
  onClassic: () => void;
  children: React.ReactNode;
}

const btn: React.CSSProperties = {
  height: 42, padding: '0 16px', borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  background: '#fff', color: 'var(--ink-soft)', border: '1px solid #cfc7b9',
};

/**
 * Si le code du campus ne se charge pas (réseau coupé, nouvelle version mise en ligne entre-temps…),
 * seul le campus affiche une erreur : sans ce filet, toute la page disparaîtrait, et à chaque visite
 * puisque le choix « Campus » est mémorisé.
 */
export class CampusErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    console.error('Campus : chargement impossible', err);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid place-items-center text-center" style={{ height: 'calc(100dvh - 60px)', minHeight: 420, padding: 16, background: '#e6e1d8' }}>
        <div>
          <p className="fd-display" style={{ margin: '0 0 12px', fontStyle: 'italic', fontSize: 17, color: 'var(--ink-soft)' }}>
            Le campus n’a pas pu se charger.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {/* React.lazy garde l'échec en mémoire : seul un rechargement de la page retente le téléchargement. */}
            <button type="button" style={btn} onClick={() => window.location.reload()}>Recharger</button>
            <button type="button" style={btn} onClick={this.props.onClassic}>Vue classique</button>
          </div>
        </div>
      </div>
    );
  }
}
