// Textes des rubriques Exercices / Leçons / Devoirs / Bac national, partagés par la liste (ContentList) et
// les dossiers (ContentFolders). Mêmes titres que les pages pré-remplies par le serveur (backend config/seo.py).
import type { HubSection } from '@/lib/api/hubApi';

export type ContentKind = 'exercise' | 'exam' | 'lesson';

export const SECTION_OF: Record<ContentKind, HubSection> = { exercise: 'exercises', lesson: 'lessons', exam: 'exams' };

export const LIST_SEO: Record<ContentKind, { title: string; description: string }> = {
  exercise: {
    title: 'Exercices de maths corrigés – Tronc commun, 1ère et 2ème Bac (Maroc) | Fidni',
    description: 'Exercices de maths corrigés pour le lycée au Maroc : Tronc commun, 1ère Bac SM, 2ème Bac SM et PC (BIOF). Classés par chapitre, avec solutions détaillées. Gratuit.',
  },
  lesson: {
    title: 'Cours de maths – Tronc commun, 1ère et 2ème Bac (Maroc) | Fidni',
    description: 'Cours de maths du lycée au Maroc : définitions, théorèmes, propriétés et méthodes, du Tronc commun au 2ème Bac SM. Leçons claires, à imprimer ou à ranger dans ton cahier. Gratuit.',
  },
  exam: {
    title: 'Devoirs surveillés et examens de maths corrigés – Bac Maroc | Fidni',
    description: 'Devoirs surveillés et sujets d’examen de maths corrigés pour le Bac au Maroc : Tronc commun, 1ère Bac SM, 2ème Bac SM et PC. Barème, durée, corrigé détaillé et épreuve chronométrée.',
  },
};

// Section « Bac national » (examens nationaux) : textes propres (la liste et ses filtres restent les mêmes).
export const NATIONAL = {
  title: 'Bac national',
  subtitle: 'Les sujets du Bac national, corrigés, pour t’entraîner en conditions réelles.',
  seoTitle: 'Examens nationaux de maths corrigés – Bac Maroc | Fidni',
  seoDescription: 'Sujets d’examen national de mathématiques du Bac marocain (2ème Bac SM et PC), avec corrigé détaillé et épreuve chronométrée.',
};

/** Titres et mots des rubriques pour les dossiers (mêmes titres que le menu). */
export const SECTION_TEXT: Record<ContentKind, {
  title: string; intro: string; noun: [string, string]; doneWord: [string, string]; createLabel: string; basePath: string;
}> = {
  exercise: {
    title: 'Exercices', intro: 'Choisis ton niveau, puis un chapitre : chaque dossier contient ses exercices corrigés.',
    noun: ['exercice', 'exercices'], doneWord: ['fait', 'faits'], createLabel: 'Ajouter un exercice', basePath: '/exercises',
  },
  lesson: {
    title: 'Leçons', intro: 'Choisis ton niveau, puis un chapitre : chaque dossier contient le cours du chapitre.',
    noun: ['leçon', 'leçons'], doneWord: ['lue', 'lues'], createLabel: 'Ajouter une leçon', basePath: '/lessons',
  },
  exam: {
    title: 'Devoirs (DS)', intro: 'Choisis ton niveau, puis un chapitre : chaque dossier contient ses devoirs surveillés corrigés.',
    noun: ['devoir', 'devoirs'], doneWord: ['fait', 'faits'], createLabel: 'Ajouter un examen', basePath: '/exams',
  },
};

export const plural = (n: number, [one, many]: [string, string]) => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;

/** Paramètres que la liste lit (ContentList : getInitialFilters, tri, dossier « Sans chapitre »). Les autres
 *  (fbclid, utm_*, gclid… ajoutés par les réseaux sociaux et la publicité) n'empêchent pas les dossiers. */
export const LIST_KEYS = new Set([
  'classLevels', 'subjects', 'subfields', 'chapters', 'theorems', 'difficulties', 'showViewed', 'hideViewed',
  'showCompleted', 'showFailed', 'todo', 'isNationalExam', 'dateStart', 'dateEnd', 'sort', 'sansChapitre',
]);

/** L'adresse demande-t-elle la liste filtrée (anciens liens, « S'entraîner », recherche) plutôt que les dossiers ? */
export const hasListParams = (search: string) => [...new URLSearchParams(search).keys()].some((k) => LIST_KEYS.has(k));
