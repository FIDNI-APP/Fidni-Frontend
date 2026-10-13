// Données de « Ma progression » (GET /api/stats/progression/), affichées tout de suite au retour sur la
// page : la dernière réponse est gardée (mémoire + onglet), puis rafraîchie en arrière-plan.
// `reload()` : nouvel essai après un échec (bouton « Réessayer ») ; `update(fn)` : changement fait sur la page
// (objectif quotidien), gardé aussi dans le cache pour ne pas réapparaître à l'ancienne valeur au retour.
// Clé : l'identifiant du compte (String(user.id)) partout — page, profil, quiz (13/10/2026 : le profil et le quiz
// passaient le pseudo, le cache n'était jamais partagé). Une réponse d'avant la maîtrise (sans `apercu`) est ignorée.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/apiClient';
import type { ProgressionData } from './types';

const KEY = 'fidni.progression';
let memory: { user: string; data: ProgressionData } | null = null;

function read(user: string): ProgressionData | null {
  if (memory?.user === user && memory.data.apercu) return memory.data;
  try {
    const raw = sessionStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) as { user: string; data: ProgressionData } : null;
    return saved?.user === user && saved.data?.apercu ? saved.data : null;
  } catch {
    return null;
  }
}

function write(user: string, data: ProgressionData) {
  memory = { user, data };
  try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* stockage plein ou interdit */ }
}

export function useProgression(user: string | null) {
  const [data, setData] = useState<ProgressionData | null>(() => (user ? read(user) : null));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const cached = read(user);
    if (cached) setData(cached);
    api.get('/stats/progression/')
      .then((r) => { if (!alive) return; write(user, r.data); setData(r.data); setFailed(false); })
      .catch(() => { if (alive && !cached) setFailed(true); });
    return () => { alive = false; };
  }, [user, attempt]);
  const reload = useCallback(() => { setFailed(false); setAttempt((n) => n + 1); }, []);
  const update = useCallback((fn: (d: ProgressionData) => ProgressionData) => {
    setData((d) => {
      if (!d) return d;
      const next = fn(d);
      if (user) write(user, next);
      return next;
    });
  }, [user]);
  return { data, failed, setData, reload, update };
}
