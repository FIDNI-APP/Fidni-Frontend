/**
 * Petits outils partagés par la navigation (barre latérale, barre du haut, barre d'onglets mobile).
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listClassrooms } from '@/lib/api/classroomApi';
import { slugify } from '@/lib/api/hubApi';
import type { User } from '@/types';

/** Hauteur de la barre d'onglets du téléphone (MobileTabBar la publie ; 0 sur ordinateur ou quand elle est cachée). */
export const TABBAR_VAR = '--fd-tabbar-h';
/** À utiliser comme `bottom` (ou dans un calc) par les éléments fixés en bas de l'écran. */
export const TABBAR_OFFSET = `var(${TABBAR_VAR}, 0px)`;

/* ── Barre d'onglets cachée à la demande d'une page (épreuve chronométrée en cours…) ── */

let tabBarHiders = 0;
const tabBarListeners = new Set<() => void>();
export const subscribeTabBar = (l: () => void) => { tabBarListeners.add(l); return () => { tabBarListeners.delete(l); }; };
export const tabBarForcedHidden = () => tabBarHiders > 0;
const emitTabBar = () => tabBarListeners.forEach((l) => l());

/** Cache la barre d'onglets du téléphone tant que `hidden` est vrai (ex. une épreuve a démarré). */
export function useHideMobileTabBar(hidden: boolean) {
  useEffect(() => {
    if (!hidden) return;
    tabBarHiders += 1; emitTabBar();
    return () => { tabBarHiders -= 1; emitTabBar(); };
  }, [hidden]);
}

// Pages d'épreuve : la barre d'onglets n'y a pas sa place. L'onboarding garde aussi toute l'attention.
// L'épreuve d'un examen (/exams/:id) la cache elle-même pendant le chrono (ExamView, useHideMobileTabBar).
const TABBAR_HIDDEN_ROUTES = [
  /^\/concours\/simulate\//, /^\/revisions\/ds\/[^/]+\/blanc\/?$/, /^\/complete-profile\/?$/,
];

/**
 * La barre d'onglets du téléphone est-elle affichée sur cette page ? Quand elle ne l'est pas, la barre
 * du haut remontre son bouton « Menu » (sinon le menu serait hors d'atteinte).
 */
export function useMobileTabBarVisible(): boolean {
  const { pathname } = useLocation();
  const forced = useSyncExternalStore(subscribeTabBar, tabBarForcedHidden);
  return !forced && !TABBAR_HIDDEN_ROUTES.some((r) => r.test(pathname));
}

/** Slug du niveau de l'élève (« 2eme-bac-sm », même règle que Django : hubApi.slugify), ou null s'il ne l'a pas indiqué. */
export function studentLevelSlug(user: User | null | undefined): string | null {
  const p = user?.profile;
  if (!p || p.user_type === 'teacher') return null;
  const name = p.class_level_name
    || (p.class_level && typeof p.class_level === 'object' ? p.class_level.name : null);
  return name ? slugify(name) || null : null;
}

/** Page d'une rubrique (« /exercises », « /exams », « /lessons ») : celle du niveau de l'élève quand on le connaît. */
export const sectionHome = (user: User | null | undefined, base: '/exercises' | '/exams' | '/lessons') => {
  const slug = studentLevelSlug(user);
  return slug ? `${base}/niveau/${slug}` : base;
};

/** Page « Exercices » de l'élève : celle de son niveau quand on le connaît. */
export const exercisesHome = (user: User | null | undefined) => sectionHome(user, '/exercises');

/** Onglet affiché par /revision-lists : celui de l'adresse, sinon le dernier ouvert (pages/RevisionLists.tsx). */
export function revisionTab(search: string): 'ds' | 'listes' {
  const t = new URLSearchParams(search).get('onglet');
  if (t === 'ds' || t === 'listes') return t;
  try {
    const stored = localStorage.getItem('fidni:revisions:onglet');
    if (stored === 'ds' || stored === 'listes') return stored;
  } catch { /* stockage indisponible */ }
  return 'ds';
}

const CLASS_KEY = 'fidni:a-une-classe:';
const readClassCache = (uid: string): boolean | null => {
  try {
    const v = sessionStorage.getItem(CLASS_KEY + uid);
    return v === null ? null : v === '1';
  } catch { return null; }
};

/**
 * L'entrée « Classes » ne concerne qu'un prof ou un élève inscrit dans une classe. La réponse est
 * gardée pour la session ; elle est relue en quittant /classrooms (l'élève vient peut-être d'en rejoindre une).
 */
export function useHasClassroom(): boolean {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const uid = user?.id ? String(user.id) : null;
  const isTeacher = user?.profile?.user_type === 'teacher';
  const onClassrooms = pathname === '/classrooms' || pathname.startsWith('/classrooms/');
  const [has, setHas] = useState<boolean>(() => (uid ? readClassCache(uid) ?? false : false));

  useEffect(() => {
    if (!uid || isTeacher) return;
    if (onClassrooms) {
      try { sessionStorage.removeItem(CLASS_KEY + uid); } catch { /* rien */ }
      return;
    }
    const cached = readClassCache(uid);
    if (cached !== null) { setHas(cached); return; }
    let cancelled = false;
    listClassrooms()
      .then((list) => {
        const v = list.length > 0;
        try { sessionStorage.setItem(CLASS_KEY + uid, v ? '1' : '0'); } catch { /* rien */ }
        if (!cancelled) setHas(v);
      })
      .catch(() => { /* on garde la dernière valeur connue */ });
    return () => { cancelled = true; };
  }, [uid, isTeacher, onClassrooms]);

  return !!uid && (isTeacher || has || onClassrooms);
}
