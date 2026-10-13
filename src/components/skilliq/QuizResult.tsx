// Résultat d'un quiz : le score (anneau), l'écart avec le passage précédent, une phrase pour la suite et UNE action
// principale (s'entraîner sur le chapitre, ou « Retour à mon DS » quand on vient du plan d'un DS : ?retour=).
// Puis le bilan par théorème (13/10/2026) : ce que l'élève maîtrise, ce qu'il doit revoir, et si le chapitre est
// maîtrisé à 100 %. La correction est repliée, les erreurs d'abord.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Dumbbell, LineChart, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { lessonsUrl, practiceUrl } from '@/pages/progression/links';
import { Delta } from './QuizRow';
import { MathText } from './MathText';
import {
  RING, hasReport, pct, plural, previousPct,
  type ActiveQuiz, type CorrectionItem, type QuizQuestion, type SkillAssessment, type TheoremReport,
} from './types';

/** Bilan par théorème : du moins maîtrisé au mieux maîtrisé (vert à 100 %, or en dessous : jamais de rouge). */
const TheoremBoard: React.FC<{ report: TheoremReport }> = ({ report }) => {
  const toReview = report.theoremes.filter((t) => t.pct < 100);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="quiz-theorems-title">
      {report.complet ? (
        <div className="flex items-start gap-3 rounded-xl bg-brand-soft px-4 py-3">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-brand-hover" aria-hidden />
          <div>
            <h2 id="quiz-theorems-title" className="text-[15px] font-semibold text-brand-hover">Chapitre maîtrisé à 100 %</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">Tous les théorèmes du chapitre ont été évalués, et toutes tes réponses sont justes.</p>
          </div>
        </div>
      ) : (
        <div>
          <h2 id="quiz-theorems-title" className="fd-display text-[18px] leading-tight text-ink">Ce que tu maîtrises</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            {toReview.length > 0
              ? <>À revoir : <b className="font-semibold text-ink">{plural(toReview.length, 'théorème')}</b> sur {report.theoremes.length}. Un théorème est maîtrisé quand toutes ses questions sont justes.</>
              : <>Tout est juste sur ce passage, mais certains théorèmes n’ont pas été évalués : refais le quiz pour les couvrir.</>}
          </p>
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-3">
        {report.theoremes.map((t) => {
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
                  {t.pct} % <span className="font-normal text-ink-faint">· {t.justes}/{t.total}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efece6]" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${Math.max(t.pct, 3)}%`, background: ok ? RING.good : RING.low }} />
              </div>
            </li>
          );
        })}
      </ul>
      {report.non_evalues.length > 0 && (
        <p className="mt-4 text-[12.5px] text-ink-faint">
          Pas évalués sur ce passage : {report.non_evalues.map((t) => t.name).join(' · ')}.
        </p>
      )}
    </section>
  );
};

const sentence = (score: number, progressed: boolean) => {
  const base = score >= 80 ? 'Très bien : ce chapitre est solide. Quelques exercices plus difficiles le garderont en tête.'
    : score >= 50 ? 'Bonne base. Quelques exercices ciblés, et ce chapitre sera acquis.'
      : 'C’est le bon moment pour reprendre ce chapitre, en commençant par les exercices les plus faciles.';
  return progressed ? `Tu progresses ! ${base}` : base;
};

const linkCls = 'inline-flex min-h-10 items-center gap-1.5 font-semibold text-ink-soft transition-colors hover:text-ink';

const Mistake: React.FC<{ c: CorrectionItem; q: QuizQuestion; n: number }> = ({ c, q, n }) => (
  <li className="rounded-2xl border border-[#f1d3cf] bg-[#fdf6f5] p-4">
    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#a23b34]">
      <XCircle className="h-4 w-4" aria-hidden /> Question {n}
      {c.theoremes && c.theoremes.length > 0 && <span className="font-normal text-ink-faint">· {c.theoremes.join(' · ')}</span>}
    </p>
    <p className="mt-1.5 text-[14.5px] font-semibold leading-relaxed text-ink"><MathText text={q.question} className="fd-latex" /></p>
    <dl className="mt-2 grid gap-1 text-[13.5px] text-ink-soft">
      <div>
        <dt className="inline">Ta réponse : </dt>
        <dd className="inline">
          {c.your_answer !== null && q.options[c.your_answer] !== undefined
            ? <MathText text={q.options[c.your_answer]} className="fd-latex line-through decoration-[#a23b34]/60" />
            : <i>pas de réponse</i>}
        </dd>
      </div>
      <div>
        <dt className="inline">Bonne réponse : </dt>
        <dd className="inline font-semibold text-ink"><MathText text={q.options[c.correct_answer] ?? ''} className="fd-latex" /></dd>
      </div>
    </dl>
    {c.explanation && (
      <p className="mt-3 rounded-xl bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-soft ring-1 ring-[#f1e4e1]">
        <MathText text={c.explanation} className="fd-latex" />
      </p>
    )}
  </li>
);

export const QuizResult: React.FC<{
  quiz: ActiveQuiz;
  result: SkillAssessment;
  questions: QuizQuestion[];
  retour: string | null;
  onRedo: () => void;
  onBack: () => void;
}> = ({ quiz, result, questions, retour, onRedo, onBack }) => {
  const score = pct(result);
  const before = previousPct(result);
  const hub = result.hub_url ?? quiz.hub_url;
  // Le thème du chapitre (Analyse…) dit plus que la matière, toujours « Mathématiques ».
  const subject = quiz.subject ?? result.subject_name;
  // Correction dans l'ordre du quiz, erreurs d'abord.
  const order = new Map(questions.map((q, i) => [q.id, i]));
  const byId = new Map(questions.map((q) => [q.id, q]));
  const correction = (result.correction ?? []).filter((c) => byId.has(c.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const wrong = correction.filter((c) => !c.is_correct);
  const right = correction.filter((c) => c.is_correct);
  const total = correction.length || questions.length;
  // Le pourcentage compte un peu plus les questions difficiles : on le dit quand il s'écarte du simple compte.
  const weighted = correction.length > 0 && Math.round((right.length / correction.length) * 100) !== score;

  const practice = (
    <Link to={practiceUrl(hub, quiz.id)} className={retour ? linkCls : 'fd-btn-primary min-h-11 justify-center text-[14px]'}>
      <Dumbbell className="h-4 w-4" aria-hidden /> S’entraîner sur ce chapitre {!retour && <ArrowRight className="h-4 w-4" aria-hidden />}
    </Link>
  );

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
            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">Quiz terminé{subject ? ` · ${subject}` : ''}</p>
            <h1 id="quiz-result-title" className="fd-display mt-1.5 text-[24px] leading-tight text-ink sm:text-[26px]">{quiz.name}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 sm:justify-start">
              <p className="text-[14px] text-ink-soft">
                <b className="fd-nums text-ink">{right.length}</b> bonne{right.length > 1 ? 's' : ''} réponse{right.length > 1 ? 's' : ''} sur <span className="fd-nums">{total}</span>
              </p>
              <Delta a={result} long />
            </div>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-soft">{sentence(score, before !== null && score > before)}</p>
            {weighted && <p className="mt-1.5 text-[12px] text-ink-faint">Les questions difficiles comptent un peu plus dans le score.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line bg-[#fcfbf9] px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-7">
          {retour ? (
            <Link to={retour} className="fd-btn-primary min-h-11 justify-center text-[14px]">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Retour à mon DS
            </Link>
          ) : practice}
          <div className="flex flex-wrap items-center justify-center gap-x-4 text-[13px] sm:justify-start">
            {retour && practice}
            <Link to={lessonsUrl(hub, quiz.id)} className={linkCls}><BookOpen className="h-4 w-4" aria-hidden /> Le cours</Link>
            <Link to={`/progression?chapitre=${quiz.id}`} className={linkCls}><LineChart className="h-4 w-4" aria-hidden /> Ma progression</Link>
            <button type="button" onClick={onRedo} className={linkCls}><RotateCcw className="h-4 w-4" aria-hidden /> Refaire le quiz</button>
          </div>
        </div>
      </section>

      {hasReport(result.par_theoreme) && <TheoremBoard report={result.par_theoreme} />}

      {correction.length > 0 && (
        <details className="group rounded-2xl border border-line bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 text-[14px] text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-5 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-90" aria-hidden />
            <span className="min-w-0 flex-1"><b className="font-semibold text-ink">Revoir la correction</b></span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${wrong.length ? 'bg-[#fbecea] text-[#a23b34]' : 'bg-brand-soft text-brand-hover'}`}>
              {wrong.length ? plural(wrong.length, 'erreur') : 'Tout juste'}
            </span>
          </summary>
          <div className="flex flex-col gap-5 border-t border-line px-4 py-4 sm:px-5 sm:py-5">
            {wrong.length > 0 && (
              <ol className="flex flex-col gap-3" aria-label="Erreurs">
                {wrong.map((c) => <Mistake key={c.id} c={c} q={byId.get(c.id)!} n={(order.get(c.id) ?? 0) + 1} />)}
              </ol>
            )}
            {right.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">Bonnes réponses · {right.length}</h3>
                <ol className="mt-2 divide-y divide-line">
                  {right.map((c) => {
                    const q = byId.get(c.id)!;
                    return (
                      <li key={c.id} className="flex items-start gap-2.5 py-2.5 text-[13.5px] text-ink-soft">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-label="Bonne réponse" />
                        <span className="min-w-0">
                          <span className="fd-nums text-ink-faint">{(order.get(c.id) ?? 0) + 1}. </span>
                          <MathText text={q.question} className="fd-latex" />
                          <span className="mt-0.5 block text-ink"><MathText text={q.options[c.correct_answer] ?? ''} className="fd-latex font-semibold" /></span>
                          {c.explanation && <span className="mt-1 block text-[12.5px] text-ink-faint"><MathText text={c.explanation} className="fd-latex" /></span>}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};
