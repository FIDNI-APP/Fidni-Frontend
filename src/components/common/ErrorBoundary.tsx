/**
 * Filet de sécurité (10/10/2026) : sans lui, une seule erreur pendant l'affichage démontait toute
 * l'application (page blanche). Trois niveaux :
 *  - `app`   : autour de toute l'application (main.tsx) — dernier recours, page de secours minimale ;
 *  - `page`  : autour de chaque page (App.tsx, NavbarWrapper) — la barre latérale et le menu restent ;
 *  - `block` : autour d'un bloc (cartes du Pilotage) — le reste de la page reste utilisable.
 * L'erreur est envoyée au serveur (lib/clientErrors) et visible dans /logs.
 * `resetKey` : quand il change (autre page, autres données), le bloc réessaie de s'afficher.
 */
import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { reportClientError } from '@/lib/clientErrors';

type Variant = 'app' | 'page' | 'block';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  /** Nom du bloc, dans le message (« Entonnoir »…). */
  label?: string;
  resetKey?: unknown;
}
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    reportClientError(error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && !Object.is(prev.resetKey, this.props.resetKey)) this.setState({ error: null });
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { variant = 'page', label } = this.props;
    const detail = `${error.name}: ${error.message}`;

    if (variant === 'block') {
      return (
        <section role="alert" className="fd-card border-[#f0d4cf] bg-[#fbf1ef] p-4 text-[13px] text-[#9c3b2e]">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {label ? `« ${label} » n’a pas pu s’afficher.` : 'Ce bloc n’a pas pu s’afficher.'}
          </p>
          <p className="mt-1 break-words text-[12px] text-[#9c3b2e]/80">{detail}</p>
          <button type="button" onClick={this.reset}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#e6c3bc] bg-white px-2.5 py-1 text-[12.5px] font-medium text-[#9c3b2e] hover:border-[#9c3b2e]">
            <RotateCcw className="h-3.5 w-3.5" /> Réessayer
          </button>
        </section>
      );
    }

    // `app` : en dehors du routeur et des styles de l'application, d'où des liens <a> et des styles simples.
    const app = variant === 'app';
    return (
      <div role="alert" className={app ? 'flex min-h-screen items-center justify-center bg-[#faf9f7] px-4' : 'mx-auto max-w-xl px-4 py-16'}>
        <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-gold-strong" />
          <h1 className="fd-display mt-3 text-[22px] text-ink">Cette page a rencontré un problème</h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            L’erreur nous a été signalée. Recharge la page ; si elle revient, reviens à l’accueil.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="fd-btn-primary">
              <RotateCcw className="h-4 w-4" /> Recharger la page
            </button>
            <a href="/" className="fd-btn-ghost">Retour à l’accueil</a>
          </div>
          <details className="mt-5 text-left text-[12px] text-ink-faint">
            <summary className="cursor-pointer">Détail technique</summary>
            <p className="mt-1 break-words">{detail}</p>
          </details>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
