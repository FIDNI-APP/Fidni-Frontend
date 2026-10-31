// Appels du quiz par chapitre (tous réservés aux connectés, sauf la taxonomie). Un quiz = (chapitre, niveau) depuis
// le 13/10/2026 : `levelId` absent = le niveau de l'élève. Deux quiz par chapitre depuis le 31/10/2026 : `type`
// absent = le quiz du cours, « approfondissement » = l'autre (?type= ou « type » dans le corps).
import { api } from '@/lib/api/apiClient';
import {
  quizKey, typeOf, type ActiveQuiz, type Answer, type CorrectionItem, type QuizEnCours, type QuizQuestion, type QuizStart,
  type QuizType, type SkillAssessment,
} from './types';

/** Le quiz visé par un appel : chapitre, niveau (absent : le sien), type (absent : le cours). */
export type QuizRef = Pick<ActiveQuiz, 'id' | 'levelId' | 'type'>;

const params = (levelId?: number | null, type: QuizType = 'cours') =>
  ({ ...(levelId ? { niveau: levelId } : {}), ...(type === 'cours' ? {} : { type }) });

/** Quiz prêts d'un niveau (le sien par défaut) : { "18": 12 } = 12 questions pour le chapitre 18. */
export const getAvailable = async (levelId?: number | null, type: QuizType = 'cours') =>
  ((await api.get('/skill-assessments/available/', { params: params(levelId, type) })).data ?? {}) as Record<string, number>;

/** Quiz prêts de tous les niveaux : { "<niveau>": { "<chapitre>": nombre } } (barre de niveaux). */
export const getAvailableAll = async (type: QuizType = 'cours') =>
  ((await api.get('/skill-assessments/available/', { params: { tous: 1, ...params(null, type) } })).data ?? {}) as Record<string, Record<string, number>>;

/** Quiz sortis depuis moins de 14 jours : { quizKey(niveau, chapitre, type): date } (étiquette « Nouveau »). */
export const getNew = async () => {
  const rows = ((await api.get('/skill-assessments/nouveaux/')).data ?? []) as { niveau: number; chapitre: number; type?: QuizType; depuis: string }[];
  return Object.fromEntries(rows.map((r) => [quizKey(r.niveau, r.chapitre, typeOf(r)), r.depuis])) as Record<string, string>;
};

/** Dernier résultat de l'élève pour chaque quiz passé (un par chapitre, niveau et type). */
export const getMine = async () => ((await api.get('/skill-assessments/my/')).data ?? []) as SkillAssessment[];

/** Le quiz (une par théorème d'abord ; 404 s'il n'y en a aucune) : le passage commencé s'il y en a un (reprise :
 *  mêmes questions, corrections déjà vues, temps restant), sinon un nouveau tirage ; `nouveau` : toujours un nouveau. */
export const getQuiz = async (quiz: QuizRef, nouveau = false): Promise<QuizStart> => {
  const query = { ...params(quiz.levelId, typeOf(quiz)), ...(nouveau ? { nouveau: 1 } : {}) };
  const data = (await api.get(`/skill-assessments/quiz/${quiz.id}/`, { params: query })).data ?? {};
  const questions = (data.questions ?? []) as QuizQuestion[];
  const seconds = Number(data.duree_secondes) || questions.length * 60;
  return { questions, seconds, left: Number(data.restant_secondes ?? seconds), reprise: !!data.reprise,
    verifiees: (data.verifiees ?? []) as CorrectionItem[] };
};

/** Correction d'une question de son passage dès qu'on y a répondu (réponse verrouillée) ; `temps` : temps passé (statistiques).
 *  Plusieurs bonnes réponses : `answer` = les index cochés (juste seulement si ce sont exactement les bonnes). */
export const checkAnswer = async (questionId: number, answer: Answer, temps: number) =>
  (await api.post(`/skill-assessments/verifier/${questionId}/`, { answer, temps })).data as CorrectionItem;

/** Quiz commencés, pas encore envoyés (« Reprendre »). */
export const getEnCours = async () => ((await api.get('/skill-assessments/en-cours/')).data ?? []) as QuizEnCours[];

/** Dernier résultat d'un quiz, avec sa correction figée (« Voir mon dernier résultat »). */
export const getLastResult = async (quiz: QuizRef) =>
  (await api.get(`/skill-assessments/chapter/${quiz.id}/`, { params: params(quiz.levelId, typeOf(quiz)) })).data as SkillAssessment;

/** Envoi des réponses (-1 : sans réponse) : résultat, correction et bilan par théorème. */
export const submitQuiz = async (quiz: QuizRef, answers: Record<number, Answer>, timeSpent: number) =>
  (await api.post(`/skill-assessments/submit/${quiz.id}/`,
    { answers, time_spent: timeSpent, ...params(quiz.levelId, typeOf(quiz)) })).data as SkillAssessment;

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
