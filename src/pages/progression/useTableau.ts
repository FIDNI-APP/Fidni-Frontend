// Données du tableau de bord, par période : gardées pour la session (changer de période puis revenir est immédiat),
// relues en arrière-plan à chaque affichage.
import { useCallback, useEffect, useState } from 'react';
import { getTableau, type Periode, type Tableau } from '@/lib/api/tableauApi';

const cache = new Map<string, Tableau>();

// `eleve` : vue administrateur d'un membre (Pilotage › Membres) ; dans la clé du cache, pour ne jamais mélanger.
export function useTableau(userKey: string | null, jours: Periode, eleve?: number | null) {
  const key = userKey ? `${userKey}:${eleve ?? 'moi'}:${jours}` : null;
  const [data, setData] = useState<Tableau | null>(() => (key ? cache.get(key) ?? null : null));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    setData(cache.get(key) ?? null);
    setFailed(false);
    getTableau(jours, eleve)
      .then((t) => { cache.set(key, t); if (alive) setData(t); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [key, jours, eleve, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, failed, reload };
}
