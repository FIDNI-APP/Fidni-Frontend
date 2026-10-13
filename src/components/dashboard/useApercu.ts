// Bloc « Où j'en suis » (accueil, profil — 13/10/2026) : GET /api/stats/apercu/, léger (le serveur le tient en cache).
// Affiché tout de suite au retour (mémoire + onglet, par compte), rafraîchi en arrière-plan.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/apiClient';
import type { ApercuData } from '@/pages/progression/types';

const KEY = 'fidni.apercu';
let memory: { user: string; data: ApercuData } | null = null;

function read(user: string): ApercuData | null {
  if (memory?.user === user) return memory.data;
  try {
    const raw = sessionStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) as { user: string; data: ApercuData } : null;
    return saved?.user === user && saved.data?.apercu ? saved.data : null;
  } catch {
    return null;
  }
}

export function useApercu(user: string | null) {
  const [data, setData] = useState<ApercuData | null>(() => (user ? read(user) : null));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const cached = read(user);
    if (cached) setData(cached);
    api.get('/stats/apercu/')
      .then((r) => {
        if (!alive) return;
        memory = { user, data: r.data };
        try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* stockage plein ou interdit */ }
        setData(r.data);
        setFailed(false);
      })
      .catch(() => { if (alive && !cached) setFailed(true); });
    return () => { alive = false; };
  }, [user, attempt]);
  const reload = useCallback(() => { setFailed(false); setAttempt((n) => n + 1); }, []);
  return { data, failed, reload };
}
