/**
 * Erreurs d'affichage (10/10/2026) : une page qui plante dans le navigateur n'apparaissait nulle part côté
 * serveur — la page blanche du Pilotage n'a été vue que par l'administrateur. Les ErrorBoundary
 * (components/common/ErrorBoundary) envoient l'erreur à POST /api/logs/client-errors/
 * (backend apps/logging/client_errors.py) : elle s'affiche dans la console des journaux (/logs), regroupée par message.
 */
import { api } from './api/apiClient';

const sent = new Set<string>();

export function reportClientError(error: unknown, componentStack?: string | null) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = `${err.name}: ${err.message}`.slice(0, 500);
    // Une fois par message et par onglet : une erreur répétée à chaque rendu n'inonde pas le serveur.
    if (sent.has(message)) return;
    sent.add(message);
    api.post('/logs/client-errors/', {
      message,
      stack: (err.stack || '').slice(0, 4000),
      component_stack: (componentStack || '').slice(0, 2000),
      path: window.location.pathname.slice(0, 300),
    }).catch(() => {});
  } catch { /* le signalement ne doit jamais aggraver la situation */ }
}
