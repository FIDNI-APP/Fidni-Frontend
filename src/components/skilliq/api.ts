// Appels du quiz par chapitre (tous réservés aux connectés, sauf la taxonomie). Un quiz = (chapitre, niveau) depuis
// le 13/10/2026 : `levelId` absent = le niveau de l'élève.
import { api } from '@/lib/api/apiClient';
import { quizKey, type Answer, type CorrectionItem, type QuizEnCours, type QuizQuestion, type QuizStart, type SkillAssessment } from './types';

const level = (levelId?: number | null) => (levelId ? { niveau: levelId } : {});

/** Quiz prêts d'un niveau (le sien par défaut) : { "18": 12 } = 12 questions pour le chapitre 18. */
export const getAvailable = async (levelId?: number | null) =>
  ((await api.get('/skill-assessments/available/', { params: level(levelId) })).data ?? {}) as Record<string, number>;

/** Quiz prêts de tous les niveaux : { "<niveau>": { "<chapitre>": nombre } } (barre de niveaux). */
export const getAvailableAll = async () =>
  ((await api.get('/skill-assessments/available/', { params: { tous: 1 } })).data ?? {}) as Record<string, Record<string, number>>;

/** Quiz sortis depuis moins de 14 jours : { "<niveau>:<chapitre>": date } (étiquette « Nouveau »). */
export const getNew = async () => {
  const rows = ((await api.get('/skill-assessments/nouveaux/')).data ?? []) as { niveau: number; chapitre: number; depuis: string }[];
  return Object.fromEntries(rows.map((r) => [quizKey(r.niveau, r.chapitre), r.depuis])) as Record<string, string>;
};

/** Dernier résultat de l'élève pour chaque chapitre passé. */
export const getMine = async () => ((await api.get('/skill-assessments/my/')).data ?? []) as SkillAssessment[];

/** Le quiz (une par théorème d'abord ; 404 s'il n'y en a aucune) : le passage commencé s'il y en a un (reprise :
 *  mêmes questions, corrections déjà vues, temps restant), sinon un nouveau tirage ; `nouveau` : toujours un nouveau. */
export const getQuiz = async (chapterId: number, levelId?: number | null, nouveau = false): Promise<QuizStart> => {
  const params = { ...level(levelId), ...(nouveau ? { nouveau: 1 } : {}) };
  const data = (await api.get(`/skill-assessments/quiz/${chapterId}/`, { params })).data ?? {};
  const questions = (data.questions ?? []) as QuizQuestion[];
  const seconds = Number(data.duree_secondes) || questions.length * 60;
  return { questions, seconds, left: Number(data.restant_secondes ?? seconds), reprise: !!data.reprise,
    verifiees: (data.verifiees ?? []) as CorrectionItem[] };
};

/** Correction d'une question de son passage dès qu'on y a répondu (réponse verrouillée) ; `temps` : minuteur utilisé.
 *  Plusieurs bonnes réponses : `answer` = les index cochés (juste seulement si ce sont exactement les bonnes). */
export const checkAnswer = async (questionId: number, answer: Answer, temps: number) =>
  (await api.post(`/skill-assessments/verifier/${questionId}/`, { answer, temps })).data as CorrectionItem;

/** Quiz commencés, pas encore envoyés (« Reprendre »). */
export const getEnCours = async () => ((await api.get('/skill-assessments/en-cours/')).data ?? []) as QuizEnCours[];

/** Dernier résultat d'un quiz, avec sa correction figée (« Voir mon dernier résultat »). */
export const getLastResult = async (chapterId: number, levelId?: number | null) =>
  (await api.get(`/skill-assessments/chapter/${chapterId}/`, { params: level(levelId) })).data as SkillAssessment;

/** Envoi des réponses (-1 : sans réponse, temps écoulé) : résultat, correction et bilan par théorème. */
export const submitQuiz = async (chapterId: number, levelId: number | null | undefined, answers: Record<number, Answer>, timeSpent: number) =>
  (await api.post(`/skill-assessments/submit/${chapterId}/`, { answers, time_spent: timeSpent, ...level(levelId) })).data as SkillAssessment;

export interface TaxonomyLevel {
  id: number;
  name: string;
  subjects: { id: number; name: string; chapters: { id: number; name: string }[] }[];
}

// Programme de tous les niveaux : chargé seulement quand on en a besoin (autre niveau, lien vers un chapitre hors programme).
let taxonomy: Promise<TaxonomyLevel[]> | null = null;
export const getTaxonomy = () => {
  taxonomy ??= api.get('/class-levels/?include_taxonomy=true')
    .then((r) => (r.data ?? []) as TaxonomyLevel[])
    .catch((e) => { taxonomy = null; throw e; });
  return taxonomy;
};

/** Nom et matière d'un chapitre, d'après la taxonomie (null s'il est inconnu). */
export const findChapter = async (id: number) => {
  for (const lv of await getTaxonomy()) {
    for (const s of lv.subjects) {
      const c = s.chapters.find((x) => x.id === id);
      if (c) return { id: c.id, name: c.name, subject: s.name };
    }
  }
  return null;
};
