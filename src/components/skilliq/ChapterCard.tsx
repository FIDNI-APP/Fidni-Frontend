// Carte d'un chapitre sur la page des quiz (31/10/2026) : ses deux quiz en deux étapes reliées (le quiz du cours,
// puis l'approfondissement) et un seul bouton mis en avant, la suite logique pour ce chapitre. Chaque étape s'ouvre
// aussi directement : son dernier résultat si elle est faite, sinon le quiz.
import React from 'react';
import { Award, Check, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { t } from '@/i18n';
import { DeepBadge, NewBadge } from './QuizRow';
import { QUIZ_TYPE } from './quizTypes';
import { frDate, isApprofondi, pct, quizSize, type QuizEnCours, type QuizStage, type QuizType } from './types';

/** Un quiz d'un chapitre pour la carte : son état et ses actions. */
export interface StageProps { stage: QuizStage; enCours: QuizEnCours | null; onStart: () => void; onView?: () => void }

type Step = { type: QuizType; kind: 'reprendre' | 'commencer' | 'refaire' };

/** La suite logique : reprendre un passage commencé, faire le quiz du cours, puis l'approfondissement, puis refaire
 *  l'approfondissement tant que le badge manque, sinon le quiz du cours. */
function nextStep(cours: StageProps, deep?: StageProps): Step | null {
  if (cours.enCours) return { type: 'cours', kind: 'reprendre' };
  if (deep?.enCours) return { type: 'approfondissement', kind: 'reprendre' };
  if (cours.stage.ready > 0 && !cours.stage.taken) return { type: 'cours', kind: 'commencer' };
  if (deep && deep.stage.ready > 0 && !deep.stage.taken) return { type: 'approfondissement', kind: 'commencer' };
  if (deep?.stage.taken && deep.stage.ready > 0 && !isApprofondi(deep.stage.taken)) return { type: 'approfondissement', kind: 'refaire' };
  if (cours.stage.taken && cours.stage.ready > 0) return { type: 'cours', kind: 'refaire' };
  return null;
}

const stepLabel = (s: Step) => (s.type === 'cours'
  ? (s.kind === 'reprendre' ? t('Reprendre le quiz du cours') : s.kind === 'commencer' ? t('Commencer le quiz du cours') : t('Refaire le quiz du cours'))
  : (s.kind === 'reprendre' ? t('Reprendre l’approfondissement') : s.kind === 'commencer' ? t('Commencer l’approfondissement') : t('Refaire l’approfondissement')));

/** Pastille d'une étape : numéro, coche (faite), médaille (badge), en cours (or), bientôt (pointillés). */
const Dot: React.FC<{ n: number | null; type: QuizType; p: StageProps }> = ({ n, type, p }) => {
  const { taken, ready } = p.stage;
  const Icon = QUIZ_TYPE[type].icon;
  const base = 'relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold';
  if (type === 'approfondissement' && isApprofondi(taken)) {
    return <span className={`${base} bg-gold text-white`} aria-hidden><Award className="h-4 w-4" /></span>;
  }
  if (taken && !p.enCours) {
    return <span className={`${base} ${pct(taken) >= 50 ? 'bg-brand' : 'bg-gold'} text-white`} aria-hidden><Check className="h-4 w-4" /></span>;
  }
  if (p.enCours) return <span className={`${base} border-2 border-gold bg-gold-soft text-gold-strong`} aria-hidden>{n ?? <Icon className="h-3.5 w-3.5" />}</span>;
  if (ready === 0) return <span className={`${base} border border-dashed border-[#cfc9bf] bg-white text-ink-faint`} aria-hidden>{n ?? <Icon className="h-3.5 w-3.5" />}</span>;
  return <span className={`${base} border border-[#cfc9bf] bg-white text-ink-soft`} aria-hidden>{n ?? <Icon className="h-3.5 w-3.5" />}</span>;
};

/** Une étape : le quiz, son état (questions, en cours, fait le…), son score ; un clic l'ouvre. */
const StepRow: React.FC<{ n: number | null; type: QuizType; name: string; p: StageProps; line?: 'done' | 'todo' }> = ({
  n, type, name, p, line,
}) => {
  const label = t(QUIZ_TYPE[type].label);
  const { ready, taken } = p.stage;
  const score = taken ? pct(taken) : null;
  const view = taken && p.onView && !p.enCours ? p.onView : null;
  const action = view ?? (ready > 0 ? p.onStart : null);
  const state = p.enCours ? t('En cours · {a}/{n}', { a: p.enCours.repondues, n: p.enCours.total })
    : taken ? t('Fait le {date}', { date: frDate(taken.completed_at) })
      : ready > 0 ? t('{n} questions', { n: quizSize(ready) }) : t('Bientôt');
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13.5px] font-medium leading-tight ${ready > 0 || taken ? 'text-ink' : 'text-ink-faint'}`}>{label}</span>
        <span className={`fd-nums mt-0.5 block text-[12px] ${p.enCours ? 'font-medium text-gold-strong' : 'text-ink-faint'}`}>{state}</span>
      </span>
      {score !== null && !p.enCours && (
        <span className={`fd-nums shrink-0 text-[15px] font-bold ${score >= 50 ? 'text-brand-hover' : 'text-gold-strong'}`}>{score} %</span>
      )}
      {action && <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover/step:text-ink" aria-hidden />}
    </>
  );
  const aria = p.enCours ? t('Reprendre : {quiz} « {name} »', { quiz: label, name })
    : view ? t('Voir mon dernier résultat : {quiz} « {name} »', { quiz: label, name })
      : t('Commencer : {quiz} « {name} »', { quiz: label, name });
  return (
    <li className="relative flex items-center gap-3">
      {/* Trait vers l'étape suivante : vert quand celle-ci est faite. */}
      {line && <span className={`absolute start-[13px] top-[30px] h-[calc(100%-14px)] w-0.5 ${line === 'done' ? 'bg-brand' : 'bg-line'}`} aria-hidden />}
      <Dot n={n} type={type} p={p} />
      {action ? (
        <button type="button" onClick={action} aria-label={aria}
          className="group/step -my-0.5 flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-start transition-colors hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          {body}
        </button>
      ) : <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2 py-1.5">{body}</div>}
    </li>
  );
};

export const ChapterCard: React.FC<{ name: string; cours: StageProps; deep?: StageProps }> = ({ name, cours, deep }) => {
  const step = nextStep(cours, deep);
  const isNew = cours.stage.fresh || (!!deep && deep.stage.fresh);
  const run = step ? (step.type === 'cours' ? cours : deep!) : null;
  // Couleur du bouton : vert pour le cours, encre pour l'approfondissement, or pour reprendre, discret pour refaire.
  const tone = !step ? '' : step.kind === 'reprendre' ? 'rounded-xl bg-gold px-4 font-semibold text-white hover:opacity-90'
    : step.kind === 'refaire' ? 'fd-btn-ghost'
      : step.type === 'cours' ? 'fd-btn-primary' : 'rounded-xl bg-ink px-4 font-semibold text-white hover:opacity-90';
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-[15.5px] font-semibold leading-snug text-ink">{name}</h3>
        {isNew && <span className="shrink-0"><NewBadge /></span>}
      </header>
      {deep && isApprofondi(deep.stage.taken) && <p className="mt-2"><DeepBadge /></p>}
      <ol className="mt-3 flex flex-col gap-1.5">
        <StepRow n={deep ? 1 : null} type="cours" name={name} p={cours} line={deep ? (cours.stage.taken ? 'done' : 'todo') : undefined} />
        {deep && <StepRow n={2} type="approfondissement" name={name} p={deep} />}
      </ol>
      {/* Le bouton reste en bas de la carte : alignés d'une carte à l'autre sur une même rangée. */}
      {step && run && (
        <div className="mt-auto pt-4">
          <button type="button" onClick={run.onStart}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap text-[13.5px] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${tone}`}>
            {step.kind === 'refaire' ? <RotateCcw className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {stepLabel(step)}
          </button>
        </div>
      )}
    </article>
  );
};
