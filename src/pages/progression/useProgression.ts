// Données de « Ma progression » (GET /api/stats/progression/), affichées tout de suite au retour sur la
// page : la dernière réponse est gardée (mémoire + onglet), puis rafraîchie en arrière-plan.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/apiClient';
import type { ProgressionData } from './types';

const KEY = 'fidni.progression';
let memory: { user: string; data: ProgressionData } | null = null;

function read(user: string): ProgressionData | null {
  if (memory?.user === user) return memory.data;
  try {
    const raw = sessionStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) as { user: string; data: ProgressionData } : null;
    return saved?.user === user ? saved.data : null;
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
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const cached = read(user);
    if (cached) setData(cached);
    api.get('/stats/progression/')
      .then((r) => { if (!alive) return; write(user, r.data); setData(r.data); setFailed(false); })
      .catch(() => { if (alive && !cached) setFailed(true); });
    return () => { alive = false; };
  }, [user]);
  return { data, failed, setData };
}
