/**
 * Parcours : chargement et sélection (niveau, matière, chapitre dans l'adresse : ?niveau=&matiere=&chapitre=, un lien
 * partagé ouvre la même vue). Niveau par défaut : celui du profil s'il a un parcours, sinon le premier.
 * Retour du lecteur vidéo : la page se recharge (nouveau montage) ; les checkpoints terminés depuis la dernière visite
 * de ce parcours sont signalés (`justDone`) pour une courte animation de validation.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { profileLevel } from '@/lib/api/hubApi';
import { getParcoursList, type Id, type Parcours } from '@/lib/api/parcoursApi';
import { completedKeys, computeProgress, sameId } from './progression';
import type { Option } from './Selectors';

const SEEN = (id: Id) => `fidni:parcours:vus:${String(id)}`;
const EMPTY: ReadonlySet<string> = new Set();
const seenCache = new WeakMap<Parcours, ReadonlySet<string>>();

function justDoneFor(parcours: Parcours, now: string[]): ReadonlySet<string> {
  const cached = seenCache.get(parcours);
  if (cached) return cached;
  let before: string[] | null = null;
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(SEEN(parcours.id)) ?? 'null');
    before = Array.isArray(stored) ? stored.filter((k): k is string => typeof k === 'string') : null;
  } catch { /* stockage indisponible */ }
  const result: ReadonlySet<string> = before ? new Set(now.filter((k) => !before!.includes(k))) : EMPTY;
  try { sessionStorage.setItem(SEEN(parcours.id), JSON.stringify(now)); } catch { /* stockage indisponible */ }
  seenCache.set(parcours, result);
  return result;
}

export function useParcours(enabled: boolean) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Parcours[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setFailed(false);
    getParcoursList()
      .then((l) => { if (alive) setList(l); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [enabled, attempt, user?.id]);

  const reload = useCallback(() => { setList(null); setAttempt((n) => n + 1); }, []);

  const levels: Option[] = useMemo(() => {
    const m = new Map<string, string>();
    (list ?? []).forEach((p) => p.class_level.forEach((l) => m.set(String(l.id), l.name)));
    return [...m].map(([id, name]) => ({ id, name }));
  }, [list]);

  const requestedPath = list?.find((p) => sameId(p.id, params.get('parcours')));
  const mine = profileLevel(user)?.id ?? null;
  const level = [params.get('niveau'), requestedPath?.class_level[0] ? String(requestedPath.class_level[0].id) : null, mine, levels[0]?.id].find((id) => id && levels.some((l) => l.id === id)) ?? '';

  const subjects: Option[] = useMemo(() => {
    const m = new Map<string, string>();
    (list ?? []).filter((p) => p.class_level.some((l) => String(l.id) === level))
      .forEach((p) => m.set(String(p.subject.id), p.subject.name));
    return [...m].map(([id, name]) => ({ id, name }));
  }, [list, level]);

  const subject = [params.get('matiere'), requestedPath ? String(requestedPath.subject.id) : null, subjects[0]?.id].find((id) => id && subjects.some((s) => s.id === id)) ?? '';

  const parcours = useMemo(() => {
    const matching = (list ?? []).filter((p) => String(p.subject.id) === subject
      && p.class_level.some((l) => String(l.id) === level));
    return matching.find((p) => sameId(p.id, params.get('parcours'))) ?? matching[0] ?? null;
  }, [list, level, subject, params]);
  const progress = useMemo(() => (parcours ? computeProgress(parcours) : null), [parcours]);

  // Chapitre affiché : celui de l'adresse s'il est ouvert, sinon le prochain checkpoint, sinon le premier.
  const asked = params.get('chapitre');
  const selected = progress
    ? progress.steps.find((s) => sameId(s.chapter.id, asked) && s.state !== 'locked')
      ?? progress.next?.step ?? progress.steps.find((s) => s.state !== 'locked') ?? progress.steps[0] ?? null
    : null;

  // Checkpoints validés depuis la dernière visite : comparés une seule fois par parcours chargé (cache par objet,
  // sûr même quand React calcule deux fois en développement).
  const justDone = useMemo(() => (parcours && progress ? justDoneFor(parcours, completedKeys(progress)) : EMPTY), [parcours, progress]);

  const set = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    setParams(next, { replace: true });
  }, [params, setParams]);

  return {
    list, failed, reload, levels, subjects, level, subject, parcours, progress, selected, justDone,
    chooseLevel: (id: string) => set({ niveau: id, matiere: null, chapitre: null, parcours: null }),
    chooseSubject: (id: string) => set({ matiere: id, chapitre: null, parcours: null }),
    chooseChapter: (id: Id) => set({ chapitre: String(id) }),
  };
}
