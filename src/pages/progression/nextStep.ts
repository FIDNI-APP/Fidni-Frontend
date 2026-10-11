// « Ton prochain pas » (11/10/2026) : le chapitre à travailler maintenant, choisi d'après les données de
// GET /api/stats/progression/, et les quelques chiffres positifs du bilan. Fonctions pures (aucun appel).
//   1. le chapitre « à renforcer » le plus faible ;
//   2. sinon le chapitre commencé le plus récemment (pas encore de pourcentage) ;
//   3. sinon le chapitre « en bonne voie » le plus bas (viser 80 %) ;
//   4. sinon un chapitre pas encore commencé (même domaine que le dernier travaillé, le plus fourni d'abord) ;
//   5. tout est maîtrisé : entretenir le moins haut.
import type { ChapterProgress, ChapterStatus, NotionStat, ProgressionData } from './types';
import { daysAgo, duration, plural } from './format';

/** Questions auto-évaluées qu'il faut pour obtenir un pourcentage (backend : MIN_QUESTIONS). */
export const MIN_QUESTIONS = 3;

export type StepKind = 'renforcer' | 'continuer' | 'consolider' | 'decouvrir' | 'entretenir';

export interface NextStep {
  kind: StepKind;
  chapter: ChapterProgress;
  /** Verbe du titre : « Renforce » Suites numériques. */
  verb: string;
  /** Pourquoi ce chapitre, en une phrase. */
  reason: string;
  /** La notion la plus fragile du chapitre, s'il y en a une. */
  focus: NotionStat | null;
  /** Les chapitres qui viendront ensuite (deux au plus). */
  then: ChapterProgress[];
}

const recent = (a: ChapterProgress, b: ChapterProgress) => (b.last_at ?? '').localeCompare(a.last_at ?? '');
const lowest = (a: ChapterProgress, b: ChapterProgress) => (a.mastery ?? 101) - (b.mastery ?? 101) || recent(a, b);
const of = (chapters: ChapterProgress[], status: ChapterStatus) => chapters.filter((c) => c.status === status);

/** Pourcentage et ce sur quoi il repose : « 45 % de réussite sur 8 questions ». */
function measured(c: ChapterProgress) {
  if (c.self_pct !== null) return `${c.mastery} % de réussite sur ${plural(c.questions, 'question évaluée', 'questions évaluées')}`;
  return `${c.mastery} % au quiz du chapitre`;
}

/** Ordre de travail de tout le programme : à renforcer, commencés, en bonne voie, à découvrir, maîtrisés. */
export function workOrder(chapters: ChapterProgress[]): ChapterProgress[] {
  const last = [...chapters].filter((c) => c.last_at).sort(recent)[0];
  const todo = of(chapters, 'todo').sort((a, b) =>
    Number(b.subfield === last?.subfield) - Number(a.subfield === last?.subfield) || b.contents - a.contents || a.name.localeCompare(b.name, 'fr'));
  return [
    ...of(chapters, 'weak').sort(lowest),
    ...of(chapters, 'started').sort(recent),
    ...of(chapters, 'good').sort(lowest),
    ...todo,
    ...of(chapters, 'mastered').sort(lowest),
  ];
}

export function pickNextStep(data: ProgressionData): NextStep | null {
  const order = workOrder(data.chapters);
  const c = order[0];
  if (!c) return null;
  const then = order.slice(1).filter((x) => x.status !== 'mastered').slice(0, 2);
  const focus = c.notions.worst[0] ?? null;
  switch (c.status) {
    case 'weak':
      return { kind: 'renforcer', chapter: c, verb: 'Renforce', reason: `${measured(c)} : c’est le chapitre où tu gagneras le plus.`, focus, then };
    case 'started': {
      const left = MIN_QUESTIONS - c.questions;
      const reason = c.questions > 0 && left > 0
        ? `Évalue encore ${plural(left, 'question', 'questions')} et tu verras où tu en es.`
        : `${c.last_at ? `Travaillé ${daysAgo(c.last_at)}` : 'Commencé'} : dis pour chaque question si tu l’as réussie, et tu verras où tu en es.`;
      return { kind: 'continuer', chapter: c, verb: 'Continue', reason, focus, then };
    }
    case 'good':
      return { kind: 'consolider', chapter: c, verb: 'Consolide', reason: `${measured(c)} : encore un effort pour passer les 80 %.`, focus, then };
    case 'todo':
      return {
        kind: 'decouvrir', chapter: c, verb: 'Commence', focus: null, then,
        reason: c.contents
          ? `${plural(c.contents, 'exercice t’attend', 'exercices t’attendent')}, du plus facile au plus difficile.`
          : 'Commence par le cours, puis les premiers exercices.',
      };
    default:
      return { kind: 'entretenir', chapter: c, verb: 'Entretiens', focus, then, reason: 'Tout ton programme est maîtrisé : garde la main avec quelques exercices.' };
  }
}

export interface Highlight { key: string; label: string; value: string; hint?: string }

/** Le bilan en chiffres positifs (jamais « 0 / 14 maîtrisé ») : seulement ce qui n'est pas nul. */
export function highlights(data: ProgressionData): Highlight[] {
  const s = data.summary;
  const ch = s.chapters;
  const t = data.time;
  const out: Highlight[] = [];
  const worked = ch.total - ch.todo;
  if (worked > 0) {
    out.push({
      key: 'chapitres', label: worked > 1 ? 'Chapitres commencés' : 'Chapitre commencé', value: String(worked),
      hint: ch.mastered ? `dont ${ch.mastered} maîtrisé${ch.mastered > 1 ? 's' : ''}` : ch.total > worked ? `sur ${ch.total} au programme` : undefined,
    });
  }
  if (s.questions_ok_week > 0) {
    out.push({ key: 'questions', label: 'Réussies cette semaine', value: `+${s.questions_ok_week}`, hint: `${plural(s.questions_ok, 'question', 'questions')} en tout` });
  } else if (s.questions_ok > 0) {
    out.push({ key: 'questions', label: 'Questions réussies', value: String(s.questions_ok), hint: 'depuis le début' });
  }
  if (t.week > 0) {
    const diff = Math.round((t.week - t.previous_week) / 60);
    out.push({
      key: 'temps', label: 'Travail cette semaine', value: duration(t.week),
      hint: t.previous_week === 0 ? undefined : diff > 0 ? `${duration(diff * 60)} de plus que la semaine passée` : diff === 0 ? 'comme la semaine passée' : undefined,
    });
  } else if (t.total_seconds > 0) {
    out.push({ key: 'temps', label: 'Temps de travail', value: duration(t.total_seconds), hint: 'depuis le début' });
  }
  if (s.streak.current >= 2) {
    out.push({ key: 'serie', label: 'Jours d’affilée', value: String(s.streak.current), hint: s.streak.best > s.streak.current ? `record : ${s.streak.best}` : 'ton record' });
  } else if (data.exams.count > 0 && data.exams.average !== null) {
    out.push({ key: 'examens', label: 'Moyenne aux examens', value: `${String(data.exams.average).replace('.', ',')} / 20`, hint: plural(data.exams.count, 'examen corrigé', 'examens corrigés') });
  }
  return out;
}
