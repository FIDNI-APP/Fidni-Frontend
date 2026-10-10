/**
 * Mesure d'usage (Pilotage › Usage) : pages vues et quelques actions sans autre trace en base.
 * On n'envoie que le motif de la route (« /exercises/:id »), jamais l'adresse exacte ni le contenu ;
 * le serveur écarte les robots et les comptes maison (apps/users/usage.py).
 */
import { matchPath } from 'react-router-dom';
import { api } from '@/lib/api/apiClient';

/** Pages suivies, de la plus précise à la plus générale (la première qui correspond l'emporte). */
export const PAGES: { pattern: string; label: string; group: string }[] = [
  { pattern: '/', label: 'Accueil', group: 'Accueil' },
  { pattern: '/exercises', label: 'Liste des exercices', group: 'Exercices' },
  { pattern: '/exercises/niveau/:level/:chapter?', label: 'Exercices d’un niveau', group: 'Exercices' },
  { pattern: '/exercises/:id/pdf', label: 'Exercice : impression', group: 'Exercices' },
  { pattern: '/exercises/:id', label: 'Page d’un exercice', group: 'Exercices' },
  { pattern: '/lessons', label: 'Liste des leçons', group: 'Leçons' },
  { pattern: '/lessons/niveau/:level/:chapter?', label: 'Leçons d’un niveau', group: 'Leçons' },
  { pattern: '/lessons/:id/pdf', label: 'Leçon : impression', group: 'Leçons' },
  { pattern: '/lessons/:id', label: 'Page d’une leçon', group: 'Leçons' },
  { pattern: '/exams', label: 'Liste des examens', group: 'Examens' },
  { pattern: '/exams/nationaux', label: 'Examens nationaux', group: 'Examens' },
  { pattern: '/exams/nationaux/:annee', label: 'Bac national : une année', group: 'Examens' },
  { pattern: '/exams/niveau/:level/:chapter?', label: 'Examens d’un niveau', group: 'Examens' },
  { pattern: '/exams/:id/pdf', label: 'Examen : impression', group: 'Examens' },
  { pattern: '/exams/:id', label: 'Page d’un examen', group: 'Examens' },
  { pattern: '/concours', label: 'Concours', group: 'Concours' },
  { pattern: '/concours/exams/:id', label: 'Sujet de concours', group: 'Concours' },
  { pattern: '/concours/simulate/:sessionId', label: 'Simulation de concours', group: 'Concours' },
  { pattern: '/concours/sessions', label: 'Historique des concours', group: 'Concours' },
  { pattern: '/concours/sessions/:sessionId/recap', label: 'Bilan d’un concours', group: 'Concours' },
  { pattern: '/concours/tips', label: 'Conseils concours', group: 'Concours' },
  { pattern: '/concours/tips/:id', label: 'Conseil concours', group: 'Concours' },
  { pattern: '/skill-iq', label: 'Skill IQ', group: 'Mon espace' },
  { pattern: '/progression', label: 'Ma progression', group: 'Mon espace' },
  { pattern: '/statistiques', label: 'Mes statistiques (ancienne page)', group: 'Mon espace' },
  { pattern: '/notebooks', label: 'Cahiers', group: 'Mon espace' },
  { pattern: '/notebooks/:id/pdf', label: 'Cahier : impression', group: 'Mon espace' },
  { pattern: '/revision-lists', label: 'Révisions', group: 'Mon espace' },
  { pattern: '/revisions/ds/:id', label: 'Plan de révision d’un DS', group: 'Mon espace' },
  { pattern: '/revisions/ds/:id/blanc', label: 'DS blanc', group: 'Mon espace' },
  { pattern: '/revision-lists/:id/pdf', label: 'Liste de révision : impression', group: 'Mon espace' },
  { pattern: '/profile/revision-lists/:id', label: 'Une liste de révision', group: 'Mon espace' },
  { pattern: '/saved', label: 'Favoris', group: 'Mon espace' },
  { pattern: '/profile/:username/edit', label: 'Modifier mon profil', group: 'Profil' },
  { pattern: '/profile/:username', label: 'Profil', group: 'Profil' },
  { pattern: '/complete-profile', label: 'Compléter son profil', group: 'Profil' },
  { pattern: '/classrooms', label: 'Classes', group: 'Classes' },
  { pattern: '/classrooms/:id', label: 'Une classe', group: 'Classes' },
  { pattern: '/learning-path', label: 'Parcours', group: 'Parcours' },
  { pattern: '/learning-path/:id', label: 'Un parcours', group: 'Parcours' },
  { pattern: '/learning-path/:pathId/chapters/:chapterId/videos/:videoId', label: 'Vidéo d’un parcours', group: 'Parcours' },
  { pattern: '/learning-path/:pathId/chapters/:chapterId/quiz', label: 'Quiz d’un parcours', group: 'Parcours' },
  { pattern: '/search', label: 'Recherche', group: 'Autres' },
  { pattern: '/login', label: 'Connexion', group: 'Compte' },
  { pattern: '/signup', label: 'Inscription', group: 'Compte' },
  { pattern: '/verify-email', label: 'Confirmation de l’e-mail', group: 'Compte' },
  { pattern: '/reset-password', label: 'Nouveau mot de passe', group: 'Compte' },
  { pattern: '/mentions-legales', label: 'Mentions légales', group: 'Autres' },
  { pattern: '/privacy-policy', label: 'Confidentialité', group: 'Autres' },
  { pattern: '/terms-of-service', label: 'Conditions d’utilisation', group: 'Autres' },
];

const LABELS = new Map(PAGES.map((p) => [p.pattern, p]));
export const pageInfo = (pattern: string) => LABELS.get(pattern) ?? { pattern, label: pattern, group: 'Autres' };

export type UsageAction =
  | 'voir-solution' | 'toutes-solutions' | 'tout-reussi' | 'trouve-apres-solution' | 'rattrapage-liste' | 'imprimer'
  | 'visite-guidee' | 'recherche' | 'onglet-activite' | 'onglet-solutions'
  | 'filtre-niveau' | 'filtre-matiere' | 'filtre-sous-domaine' | 'filtre-chapitre' | 'filtre-theoreme'
  | 'filtre-difficulte' | 'filtre-statut' | 'filtre-national' | 'filtre-date' | 'filtre-effacer' | 'tri'
  // Audit du 10/10/2026 (même liste fermée que apps/users/usage.py ACTIONS)
  | 'partager' | 'chrono-demarre' | 'epreuve-demarree' | 'epreuve-terminee' | 'similaire' | 'suivant-apres-resultat'
  | 'ressenti' | 'cloche' | 'retour-liste' | 'sommaire-lecon' | 'affichage-enonces' | 'charger-plus' | 'recherche-vide'
  | 'accueil-reprendre' | 'accueil-pour-toi' | 'annoncer-ds' | 'prog-entrainer' | 'prog-cours' | 'prog-quiz'
  | 'quiz-refait' | 'mode-revision' | 'barre-mobile' | 'visite-auto' | 'visite-passee' | 'visite-finie'
  | 'signaler-ouvert' | 'auth-ouverte' | 'connexion-google'
  // Dossiers des listes (10/10/2026)
  | 'dossier-niveau' | 'dossier-chapitre' | 'dossier-annee';

function send(kind: 'page' | 'action' | 'filtre', name: string) {
  // Jamais bloquant ni bruyant : une mesure perdue n'a aucune importance.
  try {
    api.post('/usage/', { kind, name }).catch(() => {});
  } catch { /* rien */ }
}

// Pas de `import.meta.env.DEV` ici : en production, l'obfuscation (vite.config.ts) le réécrit en
// import.meta['env']['DEV'], que Vite ne remplace plus → « Cannot read properties of undefined » à chaque
// page non suivie, page blanche (Pilotage, édition d'un contenu, 404…, 10/10/2026).
// scripts/check-build.mjs refuse désormais tout bundle qui contient encore `import.meta`.
const ON_LOCALHOST = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

let lastPath = '';
export function trackPage(pathname: string) {
  if (pathname === lastPath) return; // même adresse (double rendu, simple changement de paramètres)
  lastPath = pathname;
  try {
    const hit = PAGES.find((p) => matchPath({ path: p.pattern, end: true }, pathname));
    if (hit) send('page', hit.pattern);
    // Pages d'administration et d'édition : volontairement non suivies.
    else if (ON_LOCALHOST && !/^\/(pilotage|logs|admin|import|apercu-import|concours\/admin)|\/(new|edit|create)\/?$/.test(pathname)) {
      console.warn(`[usage] route non suivie : ${pathname} — l'ajouter à PAGES`);
    }
  } catch { /* la mesure ne doit jamais casser une page */ }
}

export function trackAction(name: UsageAction) {
  send('action', name);
}

/** Filtres des listes : chaque filtre AJOUTÉ est compté (pas ceux qu'on retire), « Tout effacer » à part. */
type Filters = Record<string, unknown>;
const FILTER_ACTIONS: [string, UsageAction][] = [
  ['classLevels', 'filtre-niveau'], ['subjects', 'filtre-matiere'], ['subfields', 'filtre-sous-domaine'],
  ['chapters', 'filtre-chapitre'], ['theorems', 'filtre-theoreme'], ['difficulties', 'filtre-difficulte'],
  ['showViewed', 'filtre-statut'], ['hideViewed', 'filtre-statut'], ['showCompleted', 'filtre-statut'],
  ['showFailed', 'filtre-statut'], ['todo', 'filtre-statut'], ['isNationalExam', 'filtre-national'],
  ['dateStart', 'filtre-date'],
];
const isSet = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== false && v !== '');
const added = (before: unknown, after: unknown) => (Array.isArray(after)
  ? after.some((x) => !(Array.isArray(before) && before.includes(x)))
  : isSet(after) && after !== before);

/** Valeur d'un filtre (09/10/2026) : « exercise:difficulte:hard », « exam:chapitre:42 », « lesson:tri:newest ».
 *  Les identifiants (niveau, chapitre…) sont traduits en noms côté serveur. */
export type ListKind = 'exercise' | 'exam' | 'lesson';
const VALUE_KEYS: [string, string][] = [
  ['classLevels', 'niveau'], ['subjects', 'matiere'], ['subfields', 'sous-domaine'], ['chapters', 'chapitre'],
  ['theorems', 'theoreme'], ['difficulties', 'difficulte'], ['dateStart', 'date'], ['isNationalExam', 'national'],
];
const STATUS_KEYS = ['showViewed', 'hideViewed', 'showCompleted', 'showFailed', 'todo'];
const VALUE_RE = /^[A-Za-z0-9_-]{1,40}$/;

function sendValue(kind: ListKind, filter: string, value: unknown) {
  const v = typeof value === 'boolean' ? (value ? 'oui' : 'non') : String(value);
  if (VALUE_RE.test(v)) send('filtre', `${kind}:${filter}:${v}`);
}

export function trackSortValue(kind: ListKind, sort: string) {
  sendValue(kind, 'tri', sort);
}

/** Niveau / chapitre choisis en ouvrant leur page (/exercises/niveau/…) depuis le site : c'est le choix le plus
 *  courant, et il ne passe pas par les filtres. Pas les arrivées directes (moteur de recherche, lien partagé). */
export function trackHubChoice(kind: ListKind, levelId: number, chapterId?: number | null) {
  if (chapterId) sendValue(kind, 'chapitre', chapterId);
  else sendValue(kind, 'niveau', levelId);
}

export function trackFilterChange(before: Filters, after: Filters, kind?: ListKind) {
  const hits = new Set<UsageAction>();
  for (const [key, action] of FILTER_ACTIONS) if (added(before[key], after[key])) hits.add(action);
  if (!hits.size && FILTER_ACTIONS.some(([k]) => isSet(before[k])) && !FILTER_ACTIONS.some(([k]) => isSet(after[k]))) {
    hits.add('filtre-effacer');
  }
  hits.forEach((a) => trackAction(a));
  if (!kind) return;
  // Chaque valeur AJOUTÉE (une difficulté cochée, un chapitre choisi…) : quelles valeurs sont les plus filtrées.
  for (const [key, name] of VALUE_KEYS) {
    const b = before[key];
    const a = after[key];
    if (Array.isArray(a)) a.filter((x) => !(Array.isArray(b) && b.includes(x))).forEach((x) => sendValue(kind, name, x));
    else if (isSet(a) && a !== b) sendValue(kind, name, a);
  }
  for (const key of STATUS_KEYS) if (after[key] === true && before[key] !== true) sendValue(kind, 'statut', key);
}

/** Porte d'entrée de la fenêtre de connexion / inscription (10/10/2026) : « vote », « bandeau », « barre-haut »…
 *  Liste ouverte côté front, mais le serveur n'accepte que [a-z0-9-]{1,30} (apps/users/usage.py FILTER_RE). */
export function trackAuthOpen(source: string) {
  trackAction('auth-ouverte');
  const s = source.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30);
  if (s) send('filtre', `auth:porte:${s}`);
}
