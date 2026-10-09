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
  { pattern: '/search', label: 'Recherche', group: 'Autres' },
  { pattern: '/login', label: 'Connexion', group: 'Compte' },
  { pattern: '/signup', label: 'Inscription', group: 'Compte' },
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
  | 'filtre-difficulte' | 'filtre-statut' | 'filtre-national' | 'filtre-date' | 'filtre-effacer' | 'tri';

function send(kind: 'page' | 'action' | 'filtre', name: string) {
  // Jamais bloquant ni bruyant : une mesure perdue n'a aucune importance.
  api.post('/usage/', { kind, name }).catch(() => {});
}

let lastPath = '';
export function trackPage(pathname: string) {
  if (pathname === lastPath) return; // même adresse (double rendu, simple changement de paramètres)
  lastPath = pathname;
  const hit = PAGES.find((p) => matchPath({ path: p.pattern, end: true }, pathname));
  if (hit) send('page', hit.pattern);
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
  ['showFailed', 'filtre-statut'], ['isNationalExam', 'filtre-national'], ['dateStart', 'filtre-date'],
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
const STATUS_KEYS = ['showViewed', 'hideViewed', 'showCompleted', 'showFailed'];
const VALUE_RE = /^[A-Za-z0-9_-]{1,40}$/;

function sendValue(kind: ListKind, filter: string, value: unknown) {
  const v = typeof value === 'boolean' ? (value ? 'oui' : 'non') : String(value);
  if (VALUE_RE.test(v)) send('filtre', `${kind}:${filter}:${v}`);
}

export function trackSortValue(kind: ListKind, sort: string) {
  sendValue(kind, 'tri', sort);
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
