// Liens « S'entraîner » et « Le cours » d'un chapitre (10/10/2026) : la page du chapitre au niveau de l'élève
// (`hub_url` renvoyé par le serveur : /exercises/niveau/2eme-bac-sm/limites-et-continuite), les plus faciles
// d'abord et sans ce qu'il a déjà réussi. Sans `hub_url` (chapitre hors de son niveau) : la liste filtrée, comme avant.
// Servent à Ma progression, au plan de DS, au quiz de chapitre, au Bilan du profil et à l'accueil.

export const PRACTICE_QUERY = '?sort=easiest&todo=true';

/** Exercices du chapitre, du plus facile au plus difficile, sans les réussis ; `difficulty` : seulement ce niveau. */
export const practiceUrl = (hubUrl: string | null | undefined, chapterId: number | string, difficulty?: string) => {
  const only = difficulty ? `&difficulties=${difficulty}` : '';
  return hubUrl ? `${hubUrl}${PRACTICE_QUERY}${only}` : `/exercises?chapters=${chapterId}${only}`;
};

/** Page d'exercices → page de leçons à la même adresse (/exercises/niveau/… → /lessons/niveau/…). */
export const lessonsHub = (hubUrl: string | null | undefined) =>
  hubUrl && hubUrl.startsWith('/exercises/') ? hubUrl.replace(/^\/exercises\//, '/lessons/') : null;

/** Leçons du chapitre. */
export const lessonsUrl = (hubUrl: string | null | undefined, chapterId: number | string) =>
  lessonsHub(hubUrl) ?? `/lessons?chapters=${chapterId}`;

/** Quiz du chapitre ; `retour` : la page où revenir après le résultat (plan de DS). */
export const quizUrl = (chapterId: number | string, retour?: string) =>
  `/skill-iq?chapitre=${chapterId}${retour ? `&retour=${encodeURIComponent(retour)}` : ''}`;

/** Chapitre sans exercice encore : « Le cours » passe devant « S'entraîner » (qui mènerait à une liste vide). */
export const courseFirst = (c: { contents: number }) => !c.contents;

/** Lien d'une action de « Ma progression » (objectif, chapitre) : s'entraîner (à la bonne difficulté), le cours, le
 *  quiz, le DS blanc, les devoirs ou le Bac national du chapitre. */
export function actionUrl(
  action: { kind: string; difficulte?: string; test_id?: number },
  chapter: { id: number; hub_url?: string | null } | null,
): string {
  const hub = chapter?.hub_url ?? null;
  switch (action.kind) {
    case 'cours': return chapter ? lessonsUrl(hub, chapter.id) : '/lessons';
    case 'quiz': return chapter ? quizUrl(chapter.id, '/progression') : '/skill-iq';
    case 'ds_blanc': return action.test_id ? `/revisions/ds/${action.test_id}/blanc` : '/reviser?onglet=ds';
    case 'devoirs': return hub ? hub.replace(/^\/exercises\//, '/exams/') : '/exams';
    case 'nationaux': return '/exams/nationaux';
    default: return chapter ? practiceUrl(hub, chapter.id, action.difficulte) : '/exercises';
  }
}
