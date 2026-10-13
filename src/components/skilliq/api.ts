// Appels du quiz par chapitre (tous réservés aux connectés, sauf la taxonomie).
import { api } from '@/lib/api/apiClient';
import type { CorrectionItem, QuizQuestion, SkillAssessment } from './types';

/** Nombre de questions actives par chapitre : quels quiz existent vraiment ({ "18": 12 }). */
export const getAvailable = async () => ((await api.get('/skill-assessments/available/')).data ?? {}) as Record<string, number>;

/** Dernier résultat de l'élève pour chaque chapitre passé. */
export const getMine = async () => ((await api.get('/skill-assessments/my/')).data ?? []) as SkillAssessment[];

/** 10 questions (une par théorème d'abord ; 404 s'il n'y en a aucune) et la durée du minuteur, en secondes. */
export const getQuiz = async (chapterId: number) => {
  const data = (await api.get(`/skill-assessments/quiz/${chapterId}/`)).data ?? {};
  const questions = (data.questions ?? []) as QuizQuestion[];
  return { questions, seconds: Number(data.duree_secondes) || questions.length * 60 };
};

/** Correction d'une question dès qu'on y a répondu : bonne réponse, explication, théorèmes. */
export const checkAnswer = async (questionId: number, answer: number) =>
  (await api.post(`/skill-assessments/verifier/${questionId}/`, { answer })).data as CorrectionItem;

/** Envoi des réponses (-1 : sans réponse, temps écoulé) : résultat, correction et bilan par théorème. */
export const submitQuiz = async (chapterId: number, answers: Record<number, number>, timeSpent: number) =>
  (await api.post(`/skill-assessments/submit/${chapterId}/`, { answers, time_spent: timeSpent })).data as SkillAssessment;

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
