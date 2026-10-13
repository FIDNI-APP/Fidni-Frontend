// Résultat d'un quiz : le score (anneau), l'écart avec le passage précédent, une phrase pour la suite et UNE action
// principale (s'entraîner sur le chapitre, ou « Retour à mon DS » quand on vient du plan d'un DS : ?retour=).
// 14/10/2026 : la correction n'est plus repliée. Onglets « Erreurs », « Sans réponse », « Toutes » ; chaque question
// montre toutes ses réponses (la sienne, la bonne) et l'explication. Le bilan par théorème ne garde que les points
// faibles (le reste se déplie). Le même écran rouvre le dernier passage (`dernier`), corrigé tel qu'il était
// (correction figée côté serveur : énoncé et réponses de ce passage-là).
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ChevronLeft, Dumbbell, LineChart, RotateCcw, Trophy, X } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { lessonsUrl, practiceUrl } from '@/pages/progression/links';
import { Delta } from './QuizRow';
import { MathText } from './MathText';
import {
  RING, answered, frDate, hasReport, pct, plural, previousPct,
  type ActiveQuiz, type CorrectionItem, type QuizQuestion, type SkillAssessment, type TheoremReport,
} from './types';

const WEAK_SHOWN = 3;

/** Bilan par théorème : les points faibles d'abord (or), le reste replié (vert à 100 % : jamais de rouge). */
const TheoremBoard: React.FC<{ report: TheoremReport }> = ({ report }) => {
  const [all, setAll] = useState(false);
  const weak = report.theoremes.filter((t) => t.pct < 100);
  const shown = all ? report.theoremes : weak.slice(0, WEAK_SHOWN);
  const hidden = report.theoremes.length - shown.length;
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="quiz-theorems-title">
      {report.complet ? (
        <div className="flex items-start gap-3 rounded-xl bg-brand-soft px-4 py-3">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-brand-hover" aria-hidden />
          <div>
            <h2 id="quiz-theorems-title" className="text-[15px] font-semibold text-brand-hover">Chapitre maîtrisé à 100 %</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">Tous les théorèmes évalués, toutes les réponses justes.</p>
          </div>
        </div>
      ) : (
        <h2 id="quiz-theorems-title" className="fd-display text-[18px] leading-tight text-ink">
          {weak.length ? <>À revoir · <span className="fd-nums">{weak.length}</span> théorème{weak.length > 1 ? 's' : ''} sur {report.theoremes.length}</> : 'Tous les théorèmes évalués sont justes'}
        </h2>
      )}
      {shown.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {shown.map((t) => {
            const ok = t.pct === 100;
            return (
              <li key={t.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-[13.5px] text-ink">
                    {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" aria-label="Maîtrisé" />
                      : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gold" aria-label="À revoir" />}
                    <span className="min-w-0">{t.name}</span>
                  </span>
                  <span className={`fd-nums shrink-0 text-[13px] font-semibold ${ok ? 'text-brand-hover' : 'text-gold-strong'}`}>
                    {t.justes}/{t.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efece6]" aria-hidden>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(t.pct, 3)}%`, background: ok ? RING.good : RING.low }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {(hidden > 0 || all) && (
        <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}
          className="mt-3 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink">
          {all ? 'Moins' : `Tout le bilan (${report.theoremes.length})`} <ChevronDown className={`h-4 w-4 transition-transform ${all ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      )}
      {all && report.non_evalues.length > 0 && (
        <p className="mt-2 text-[12.5px] text-ink-faint">Pas évalués sur ce passage : {report.non_evalues.map((t) => t.name).join(' · ')}.</p>
      )}
    </section>
  );
};

const sentence = (score: number, progressed: boolean) => {
  const base = score >= 80 ? 'Très bien : ce chapitre est solide.'
    : score >= 50 ? 'Bonne base : quelques exercices ciblés, et c’est acquis.'
      : 'Reprends ce chapitre, en commençant par les exercices faciles.';
  return progressed ? `Tu progresses ! ${base}` : base;
};

const linkCls = 'inline-flex min-h-10 items-center gap-1.5 font-semibold text-ink-soft transition-colors hover:text-ink';

type Item = CorrectionItem & { n: number; question: string; options: string[] };

/** Une question corrigée : toutes ses réponses (la tienne, la bonne), puis l'explication. */
const Corrected: React.FC<{ c: Item }> = ({ c }) => {
  const skipped = !answered(c);
  return (
    <li className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${c.is_correct ? 'bg-brand-soft text-brand-hover' : skipped ? 'bg-[#f2f1ee] text-ink-soft' : 'bg-gold-soft text-[#8a6318]'}`}>
          {c.is_correct ? <Check className="h-3.5 w-3.5" aria-hidden /> : skipped ? null : <X className="h-3.5 w-3.5" aria-hidden />}
          Question {c.n} · {c.is_correct ? 'juste' : skipped ? 'sans réponse' : 'fausse'}
        </span>
        {c.theoremes && c.theoremes.length > 0 && <span className="font-normal text-ink-faint">{c.theoremes.join(' · ')}</span>}
      </p>
      <p className="mt-2 text-[14.5px] font-semibold leading-relaxed text-ink"><MathText text={c.question} className="fd-latex" /></p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {c.options.map((opt, i) => {
          const good = i === c.correct_answer;
          const mine = i === c.your_answer;
          return (
            <li key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[14px] ${
              good ? 'border-brand/40 bg-brand-soft/60' : mine ? 'border-gold-line bg-gold-soft/60' : 'border-transparent'}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11.5px] font-bold ${
                good ? 'bg-brand text-white' : mine ? 'bg-gold text-white' : 'border border-[#d8d4cc] text-ink-faint'}`} aria-hidden>
                {good ? <Check className="h-3.5 w-3.5" /> : mine ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
              </span>
              <MathText text={opt} className={`fd-latex min-w-0 flex-1 ${good ? 'font-semibold text-ink' : 'text-ink-soft'}`} />
              {mine && <span className="shrink-0 text-[11.5px] font-semibold text-ink-faint">ta réponse</span>}
            </li>
          );
        })}
      </ul>
      {c.explanation && (
        <p className="mt-3 rounded-xl bg-paper px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          <MathText text={c.explanation} className="fd-latex" />
        </p>
      )}
    </li>
  );
};

type Tab = 'erreurs' | 'sans' | 'toutes';

export const QuizResult: React.FC<{
  quiz: ActiveQuiz;
  result: SkillAssessment;
  /** Questions servies (fin d'un passage) ; vide pour le dernier résultat (la correction porte ses énoncés). */
  questions: QuizQuestion[];
  retour: string | null;
  /** Dernier résultat rouvert depuis la liste (et non la fin d'un passage). */
  dernier?: boolean;
  onRedo: () => void;
  onBack: () => void;
}> = ({ quiz, result, questions, retour, dernier = false, onRedo, onBack }) => {
  const score = pct(result);
  const before = previousPct(result);
  const hub = result.hub_url ?? quiz.hub_url;
  // Le thème du chapitre (Analyse…) dit plus que la matière, toujours « Mathématiques ».
  const subject = quiz.subject ?? result.subject_name;
  // Correction dans l'ordre servi ; énoncé et réponses figés quand le serveur les donne, sinon ceux du quiz.
  const byId = new Map(questions.map((q) => [q.id, q]));
  const items: Item[] = (result.correction ?? []).flatMap((c, i) => {
    const q = byId.get(c.id);
    const question = c.question ?? q?.question;
    const options = c.options ?? q?.options;
    return question && options ? [{ ...c, n: i + 1, question, options }] : [];
  });
  const wrong = items.filter((c) => !c.is_correct && answered(c));
  const skipped = items.filter((c) => !answered(c));
  const right = items.filter((c) => c.is_correct);
  const total = items.length || questions.length;
  const [tab, setTab] = useState<Tab>(wrong.length ? 'erreurs' : skipped.length ? 'sans' : 'toutes');
  const list = tab === 'erreurs' ? wrong : tab === 'sans' ? skipped : items;
  // Le pourcentage compte un peu plus les questions difficiles : on le dit quand il s'écarte du simple compte.
  const weighted = items.length > 0 && Math.round((right.length / items.length) * 100) !== score;

  const practice = (
    <Link to={practiceUrl(hub, quiz.id)} className={retour || dernier ? linkCls : 'fd-btn-primary min-h-11 justify-center text-[14px]'}>
      <Dumbbell className="h-4 w-4" aria-hidden /> S’entraîner sur ce chapitre {!retour && !dernier && <ArrowRight className="h-4 w-4" aria-hidden />}
    </Link>
  );
  const tabs: [Tab, string, number][] = [['erreurs', 'Erreurs', wrong.length], ['sans', 'Sans réponse', skipped.length], ['toutes', 'Toutes', items.length]];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <button type="button" onClick={onBack}
        className="-ml-1 inline-flex min-h-10 items-center gap-1 self-start rounded-lg px-1 pr-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Quiz par chapitre
      </button>

      <section className="overflow-hidden rounded-3xl border border-line bg-white" aria-labelledby="quiz-result-title">
        <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:gap-7 sm:p-7 sm:text-left">
          <ProgressRing percentage={score} size={112} strokeWidth={9} trackColor={RING.track} progressColor={score >= 50 ? RING.good : RING.low}>
            <span className="fd-nums text-[28px] font-bold leading-none text-ink">{score}<span className="text-[15px]"> %</span></span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">
              {dernier ? `Ton dernier passage · ${frDate(result.completed_at)}` : `Quiz terminé${subject ? ` · ${subject}` : ''}`}
            </p>
            <h1 id="quiz-result-title" className="fd-display mt-1.5 text-[24px] leading-tight text-ink sm:text-[26px]">{quiz.name}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 sm:justify-start">
              <p className="text-[14px] text-ink-soft">
                <b className="fd-nums text-ink">{right.length}</b> bonne{right.length > 1 ? 's' : ''} réponse{right.length > 1 ? 's' : ''} sur <span className="fd-nums">{total}</span>
              </p>
              <Delta a={result} long />
            </div>
            {!dernier && <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-soft">{sentence(score, before !== null && score > before)}</p>}
            {weighted && <p className="mt-1.5 text-[12px] text-ink-faint">Les questions difficiles comptent un peu plus dans le score.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line bg-[#fcfbf9] px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-7">
          {dernier ? (
            <button type="button" onClick={onRedo} className="fd-btn-primary min-h-11 shrink-0 justify-center whitespace-nowrap text-[14px]">
              <RotateCcw className="h-4 w-4" aria-hidden /> Refaire le quiz
            </button>
          ) : retour ? (
            <Link to={retour} className="fd-btn-primary min-h-11 justify-center text-[14px]">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Retour à mon DS
            </Link>
          ) : practice}
          <div className="flex flex-wrap items-center justify-center gap-x-4 text-[13px] sm:justify-start">
            {(retour || dernier) && practice}
            <Link to={lessonsUrl(hub, quiz.id)} className={linkCls}><BookOpen className="h-4 w-4" aria-hidden /> Le cours</Link>
            <Link to={`/progression?chapitre=${quiz.id}`} className={linkCls}><LineChart className="h-4 w-4" aria-hidden /> Ma progression</Link>
            {!dernier && <button type="button" onClick={onRedo} className={linkCls}><RotateCcw className="h-4 w-4" aria-hidden /> Refaire le quiz</button>}
          </div>
        </div>
      </section>

      {hasReport(result.par_theoreme) && <TheoremBoard report={result.par_theoreme} />}

      {items.length > 0 ? (
        <section aria-labelledby="quiz-correction-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="quiz-correction-title" className="fd-display text-[20px] text-ink">La correction</h2>
            <div role="tablist" aria-label="Questions à revoir" className="flex flex-wrap gap-1.5">
              {tabs.map(([id, label, n]) => (n > 0 || id === 'toutes') && (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                    tab === id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:text-ink'}`}>
                  {label} <span className={`fd-nums font-normal ${tab === id ? 'text-white/75' : 'text-ink-faint'}`}>{n}</span>
                </button>
              ))}
            </div>
          </div>
          {list.length ? (
            <ol className="flex flex-col gap-3">{list.map((c) => <Corrected key={c.id} c={c} />)}</ol>
          ) : (
            <p className="rounded-2xl border border-line bg-white px-5 py-4 text-[14px] text-ink-soft">
              <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-brand" aria-hidden /> Aucune erreur : tout est juste.
            </p>
          )}
        </section>
      ) : dernier && (
        <p className="rounded-2xl border border-line bg-white px-5 py-4 text-[13.5px] text-ink-faint">
          La correction de ce passage n’a pas été gardée (passage d’avant le 14 octobre). {plural(total, 'question')}.
        </p>
      )}
    </div>
  );
};
