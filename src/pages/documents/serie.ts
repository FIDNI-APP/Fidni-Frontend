/**
 * Publier une série de TD (12/10/2026) : chaque exercice du document devient un contenu FIDNI, l'un après
 * l'autre, dans l'assistant « Ajouter un contenu » ; le prof valide les métadonnées de chacun (niveau,
 * chapitre, difficulté, théorèmes). Niveau, chapitres et établissement du précédent sont repris comme
 * proposition ; difficulté et théorèmes sont à choisir pour chaque exercice.
 *
 * La série en cours est gardée dans l'onglet (sessionStorage) : un rechargement ne la perd pas.
 */
import type { NavigateFunction } from 'react-router-dom';
import type { ContentPrefill } from './publishDraft';

const KEY = 'fidni:serie-publication';

export interface SerieCarry {
  levelIds: number[];
  subjectId: number | null;
  chapterIds: number[];
  school: { id: number | null; name: string; city?: string };
}

export interface Serie {
  from: string;
  documentId?: number | string;
  items: ContentPrefill[];
  index: number;
  published: { id: number | string; title: string }[];
  skipped: number;
  carry?: SerieCarry;
}

export function loadSerie(): Serie | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Serie) : null;
    return s && Array.isArray(s.items) && s.index < s.items.length ? s : null;
  } catch {
    return null;
  }
}

function save(s: Serie | null) {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch { /* stockage bloqué : la série s'arrête au rechargement */ }
}

const go = (navigate: NavigateFunction, s: Serie) =>
  navigate('/exercises/new', { state: { prefill: s.items[s.index], serie: { index: s.index } } });

export function startSerie(navigate: NavigateFunction, from: string, items: ContentPrefill[], documentId?: number | string) {
  const s: Serie = { from, documentId, items, index: 0, published: [], skipped: 0 };
  save(s);
  go(navigate, s);
}

/** Exercice publié (ou passé) : le suivant, ou la fin de la série (retour au document). */
export function nextInSerie(navigate: NavigateFunction, done: { id: number | string; title: string } | null, carry?: SerieCarry) {
  const s = loadSerie();
  if (!s) return;
  const next: Serie = {
    ...s, index: s.index + 1,
    published: done ? [...s.published, done] : s.published,
    skipped: s.skipped + (done ? 0 : 1),
    carry: carry ?? s.carry,
  };
  if (next.index < next.items.length) {
    save(next);
    go(navigate, next);
    return;
  }
  save(null);
  navigate(next.documentId ? `/documents/${next.documentId}` : '/documents', { state: { serieTerminee: { published: next.published, skipped: next.skipped } } });
}

export function stopSerie(navigate: NavigateFunction) {
  const s = loadSerie();
  save(null);
  navigate(s?.documentId ? `/documents/${s.documentId}` : '/documents',
    s ? { state: { serieTerminee: { published: s.published, skipped: s.skipped + (s.items.length - s.index) } } } : undefined);
}
