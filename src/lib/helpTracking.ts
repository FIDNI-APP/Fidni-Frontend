// Aides ouvertes (13/10/2026) : indication ou solution d'une question, envoyées au journal de « Ma progression »
// (POST /api/contents/<id>/aide/, backend apps/interactions/journal.py) pour savoir si une réussite a été obtenue
// sans aide. Une fois par question, type et jour (le serveur dédoublonne aussi) ; jamais bloquant.
// Chemins : celui de la question ; « * » = toutes les solutions ; « solution » = solution d'ensemble du contenu.
// Une solution ouverte marque aussi le contenu « solution vue » côté serveur (remplace markSolutionViewed).
import { api } from '@/lib/api/apiClient';

const sent = new Set<string>();

export function recordHelp(contentId: string | number, path: string, kind: 'indice' | 'solution') {
  if (!contentId || !path) return;
  const key = `${contentId}|${path}|${kind}|${new Date().toISOString().slice(0, 10)}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    api.post(`/contents/${contentId}/aide/`, { path, kind }).catch(() => { sent.delete(key); });
  } catch { sent.delete(key); }
}

/** « Je n'ai pas regardé la solution » (annulation) : la prochaine solution ouverte de ce contenu compte de nouveau. */
export function forgetHelp(contentId: string | number) {
  for (const key of [...sent]) if (key.startsWith(`${contentId}|`)) sent.delete(key);
}
