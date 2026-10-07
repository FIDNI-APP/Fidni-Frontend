import { useEffect, useState } from 'react';
import { api } from '@/lib/api/apiClient';
import { getRevisionLists } from '@/lib/api/revisionListApi';
import { getUserSavedExams, getUserSavedExercises, getUserSavedLessons } from '@/lib/api/userApi';

/** Résumé de « Mon espace » pour le tableau du cartable. null = indisponible (on affiche alors un libellé neutre). */
export interface SpaceSummary {
  notebooks: number | null;
  lists: { count: number; names: string[] } | null;
  favorites: number | null;
}

/** Nombre d'éléments d'une réponse, qu'elle soit un tableau, paginée ({ count, results }) ou enveloppée. */
function countOf(d: unknown): number {
  if (Array.isArray(d)) return d.length;
  if (d && typeof d === 'object') {
    const o = d as { count?: unknown; results?: unknown; notebooks?: unknown };
    if (typeof o.count === 'number') return o.count;
    if (Array.isArray(o.results)) return o.results.length;
    if (Array.isArray(o.notebooks)) return o.notebooks.length;
  }
  return 0;
}

/** Charge le résumé à la première ouverture du cartable (mêmes endpoints que les pages Cahiers, Révisions, Favoris). */
export function useSpaceSummary(enabled: boolean, username?: string): SpaceSummary | null {
  const [data, setData] = useState<SpaceSummary | null>(null);

  useEffect(() => {
    if (!enabled || data) return;
    let cancelled = false;
    const notebooks = api.get('/notebooks/get_notebooks/').then((r) => countOf(r.data)).catch(() => null);
    const lists = getRevisionLists()
      .then((ls) => ({ count: ls.length, names: ls.slice(0, 2).map((l) => l.name) }))
      .catch(() => null);
    const favorites = username
      ? Promise.all([getUserSavedExercises(username), getUserSavedLessons(username), getUserSavedExams(username)])
        .then((all) => all.reduce((n: number, d: unknown) => n + countOf(d), 0))
        .catch(() => null)
      : Promise.resolve(null);
    Promise.all([notebooks, lists, favorites]).then(([n, l, f]) => {
      if (!cancelled) setData({ notebooks: n, lists: l, favorites: f });
    });
    return () => { cancelled = true; };
  }, [enabled, username, data]);

  return data;
}
