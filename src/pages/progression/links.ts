// Liens « S'entraîner » et « Le cours » d'un chapitre (10/10/2026) : la page du chapitre au niveau de l'élève
// (`hub_url` renvoyé par le serveur : /exercises/niveau/2eme-bac-sm/limites-et-continuite), les plus faciles
// d'abord et sans ce qu'il a déjà réussi. Sans `hub_url` (chapitre hors de son niveau) : la liste filtrée, comme avant.
// Servent à Ma progression, au plan de DS, au quiz de chapitre, au Bilan du profil et à l'accueil.

export const PRACTICE_QUERY = '?sort=easiest&todo=true';

/** Exercices du chapitre, du plus facile au plus difficile, sans les réussis. */
export const practiceUrl = (hubUrl: string | null | undefined, chapterId: number | string) =>
  hubUrl ? `${hubUrl}${PRACTICE_QUERY}` : `/exercises?chapters=${chapterId}`;

/** Page d'exercices → page de leçons à la même adresse (/exercises/niveau/… → /lessons/niveau/…). */
export const lessonsHub = (hubUrl: string | null | undefined) =>
  hubUrl && hubUrl.startsWith('/exercises/') ? hubUrl.replace(/^\/exercises\//, '/lessons/') : null;

/** Leçons du chapitre. */
export const lessonsUrl = (hubUrl: string | null | undefined, chapterId: number | string) =>
  lessonsHub(hubUrl) ?? `/lessons?chapters=${chapterId}`;

/** Quiz du chapitre ; `retour` : la page où revenir après le résultat (plan de DS). */
export const quizUrl = (chapterId: number | string, retour?: string) =>
  `/skill-iq?chapitre=${chapterId}${retour ? `&retour=${encodeURIComponent(retour)}` : ''}`;
