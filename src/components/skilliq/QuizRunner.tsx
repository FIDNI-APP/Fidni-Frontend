// Passage d'un quiz, en mise en page « focus » : une question à la fois, grandes réponses, clavier (1 à 4, Entrée,
// ← →). Depuis le 13/10/2026, façon concours :
//  - un minuteur (1 min par question, donné par le serveur), qui s'arrête pendant la correction de chaque question ;
//    à zéro, le quiz est envoyé tel quel (une question sans réponse compte comme fausse) ;
//  - « Valider » corrige la question tout de suite (POST /skill-assessments/verifier/<id>/) : bonne réponse,
//    explication, théorème ; la réponse est alors verrouillée.
// Une question peut être laissée pour plus tard. Quitter avec des réponses demande confirmation (elles seraient perdues).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ChevronLeft, Clock, Loader2, Pause, X } from 'lucide-react';
import { useHideMobileTabBar } from '@/components/layout/nav';
import { checkAnswer, submitQuiz } from './api';
import { MathText } from './MathText';
import { DIFFICULTY, plural, type ActiveQuiz, type CorrectionItem, type Difficulty, type QuizQuestion, type SkillAssessment } from './types';

const LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/** Difficulté en trois crans (et en mots). */
const DifficultyMark: React.FC<{ value: Difficulty }> = ({ value }) => {
  const n = LEVEL[value] ?? 1;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#f7f6f3] px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-[3px] rounded-full ${i <= n ? 'bg-ink-soft' : 'bg-[#d8d4cc]'}`} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      {DIFFICULTY[value] ?? 'Facile'}
    </span>
  );
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-[#faf9f7] px-1.5 font-sans text-[11px] font-semibold text-ink-faint">
    {children}
  </kbd>
);

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Minuteur : temps restant ; « en pause » pendant la correction ; plus visible sous la dernière minute. */
const Timer: React.FC<{ left: number; paused: boolean }> = ({ left, paused }) => {
  const low = left <= 60 && !paused;
  return (
    <span role="timer" aria-label={`Temps restant : ${clock(left)}${paused ? ', en pause' : ''}`}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
        low ? 'border-[#f0d5d1] bg-[#fbecea] text-[#a23b34]' : paused ? 'border-line bg-[#f7f6f3] text-ink-faint' : 'border-line bg-white text-ink'}`}>
      {low ? <AlertTriangle className="h-4 w-4" aria-hidden /> : paused ? <Pause className="h-4 w-4" aria-hidden /> : <Clock className="h-4 w-4" aria-hidden />}
      <span className="fd-nums text-[15px] font-bold tracking-wide">{clock(left)}</span>
      {paused && <span className="hidden text-[11.5px] font-medium sm:inline">en pause</span>}
    </span>
  );
};

/** Correction de la question, juste après « Valider ». */
const Feedback: React.FC<{ c: CorrectionItem; q: QuizQuestion }> = ({ c, q }) => (
  <div role="status" className={`mt-5 rounded-2xl border p-4 ${c.is_correct ? 'border-brand/30 bg-brand-soft/50' : 'border-[#f1d3cf] bg-[#fdf6f5]'}`}>
    <p className={`flex items-center gap-1.5 text-[14px] font-semibold ${c.is_correct ? 'text-brand-hover' : 'text-[#a23b34]'}`}>
      {c.is_correct ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
      {c.is_correct ? 'Bonne réponse' : <>Pas tout à fait : la bonne réponse est {String.fromCharCode(65 + c.correct_answer)}</>}
    </p>
    {!c.is_correct && (
      <p className="mt-1 text-[13.5px] font-semibold text-ink"><MathText text={q.options[c.correct_answer] ?? ''} /></p>
    )}
    {c.explanation && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft"><MathText text={c.explanation} /></p>}
    {c.theoremes && c.theoremes.length > 0 && (
      <p className="mt-2 text-[12px] text-ink-faint">{c.theoremes.length > 1 ? 'Théorèmes' : 'Théorème'} : {c.theoremes.join(' · ')}</p>
    )}
  </div>
);

export const QuizRunner: React.FC<{
  quiz: ActiveQuiz;
  questions: QuizQuestion[];
  /** Durée du minuteur, en secondes. */
  seconds: number;
  onQuit: () => void;
  onDone: (result: SkillAssessment) => void;
}> = ({ quiz, questions, seconds, onQuit, onDone }) => {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<Record<number, CorrectionItem>>({});
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [left, setLeft] = useState(seconds);
  const [timeUp, setTimeUp] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  // Mise en page « focus » : pas de barre d'onglets du téléphone pendant le quiz.
  useHideMobileTabBar(true);

  const total = questions.length;
  const q = questions[index];
  const answer = answers[q.id];
  const correction = checked[q.id];
  const missing = questions.flatMap((x, i) => (checked[x.id] ? [] : [i]));
  const answered = Object.keys(answers).length;
  const complete = missing.length === 0;
  const isLast = index === total - 1;
  // Le chrono ne tourne que sur une question pas encore corrigée.
  const paused = !!correction || submitting || timeUp;

  const go = (i: number) => { setCheckError(false); setIndex(Math.max(0, Math.min(total - 1, i))); };
  const choose = (i: number) => { if (!correction) setAnswers((a) => ({ ...a, [q.id]: i })); };

  // Temps consommé (ms), cumulé tic après tic : les navigateurs ralentissent les minuteries des onglets en arrière-plan,
  // le décompte reste juste puisqu'il additionne le temps réellement écoulé entre deux tics.
  const used = useRef(0);
  const lastTick = useRef(Date.now());
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const submit = useCallback(async (force = false) => {
    if (submitting || (!force && !complete)) return;
    setSubmitting(true);
    setError(false);
    // Sans réponse : -1, compté faux par le serveur.
    const all = Object.fromEntries(questions.map((x) => [x.id, answers[x.id] ?? -1]));
    try {
      onDone(await submitQuiz(quiz.id, all, Math.round(used.current / 1000)));
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }, [submitting, complete, questions, answers, quiz.id, onDone]);
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (!pausedRef.current) used.current += now - lastTick.current;
      lastTick.current = now;
      const rest = Math.max(0, seconds - Math.floor(used.current / 1000));
      setLeft(rest);
      if (rest === 0 && !pausedRef.current) {
        setTimeUp(true);
        submitRef.current(true);
      }
    };
    const t = setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [seconds]);

  const validate = async () => {
    if (answer === undefined || correction || checking) return;
    setChecking(true);
    setCheckError(false);
    try {
      const c = await checkAnswer(q.id, answer);
      setChecked((m) => ({ ...m, [q.id]: c }));
    } catch {
      setCheckError(true);
    } finally {
      setChecking(false);
    }
  };

  /** Entrée : valider la réponse, puis passer à la suite (à la fin : le bilan, ou la première question restante). */
  const advance = () => {
    if (!correction) { if (answer !== undefined) validate(); return; }
    if (!isLast) go(index + 1);
    else if (complete) submit();
    else go(missing[0]);
  };

  const quit = () => (answered > 0 ? setConfirmQuit(true) : onQuit());

  // Nouvelle question : on remonte à l'en-tête si on l'a perdu de vue (téléphone).
  useEffect(() => {
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [index]);

  useEffect(() => { if (confirmQuit) stayRef.current?.focus(); }, [confirmQuit]);

  // Des réponses en cours : le navigateur prévient avant de fermer ou recharger la page.
  useEffect(() => {
    if (!answered || submitting) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [answered, submitting]);

  // Clavier : 1 à 4 (ou A à D) répondent, Entrée valide puis continue, ← → changent de question.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || confirmQuit || submitting) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const pick = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : /^[a-d]$/i.test(e.key) ? e.key.toLowerCase().charCodeAt(0) - 97 : -1;
      if (pick >= 0) {
        if (pick < q.options.length) { e.preventDefault(); choose(pick); }
        return;
      }
      if (e.key === 'Enter') {
        // Sur un bouton (Précédent, Quitter…), Entrée garde son effet normal ; sur une réponse, elle continue.
        const control = el?.closest('button, a, summary');
        if (control && control.getAttribute('role') !== 'radio') return;
        e.preventDefault();
        advance();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault(); go(index + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); go(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const good = Object.values(checked).filter((c) => c.is_correct).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div ref={topRef} className="flex scroll-mt-24 items-center justify-between gap-3">
        <button type="button" onClick={quit}
          className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 pr-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Quitter
        </button>
        <div className="flex items-center gap-3">
          <span className="fd-nums text-[13px] font-semibold text-ink-soft" aria-live="polite">Question {index + 1} sur {total}</span>
          <Timer left={left} paused={!!correction && !timeUp} />
        </div>
      </div>

      {timeUp && (
        <div role="alert" className="rounded-2xl border border-gold-line bg-gold-soft p-4 text-[13.5px] text-ink">
          <b className="font-semibold">Temps écoulé.</b> Ton quiz est envoyé tel quel : les questions sans réponse comptent comme fausses.
        </div>
      )}

      {confirmQuit && (
        <div role="alertdialog" aria-labelledby="quiz-quit-title" aria-describedby="quiz-quit-text"
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirmQuit(false); }}
          className="rounded-2xl border border-gold-line bg-gold-soft p-4 sm:p-5">
          <p id="quiz-quit-title" className="text-[15px] font-semibold text-ink">Quitter le quiz ?</p>
          <p id="quiz-quit-text" className="mt-1 text-[13.5px] text-ink-soft">
            {answered > 1 ? `Tes ${answered} réponses seront perdues.` : 'Ta réponse sera perdue.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button ref={stayRef} type="button" onClick={() => setConfirmQuit(false)} className="fd-btn-primary min-h-11">Continuer le quiz</button>
            <button type="button" onClick={onQuit} className="fd-btn-ghost min-h-11 text-[13px]">Quitter</button>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">Quiz{quiz.subject ? ` · ${quiz.subject}` : ''}</p>
          <h1 className="fd-display mt-1.5 text-[24px] leading-tight text-ink sm:text-[28px]">{quiz.name}</h1>
        </div>
        {Object.keys(checked).length > 0 && (
          <p className="fd-nums text-[13px] text-ink-soft"><b className="text-ink">{good}</b> / {Object.keys(checked).length} juste{good > 1 ? 's' : ''}</p>
        )}
      </header>

      <nav aria-label="Questions" className="-my-1 flex gap-1">
        {questions.map((x, i) => {
          const on = i === index;
          const c = checked[x.id];
          const tone = c ? (c.is_correct ? 'bg-brand' : 'bg-gold') : answers[x.id] !== undefined ? 'bg-brand/45' : 'bg-line';
          return (
            <button key={x.id} type="button" onClick={() => go(i)} aria-current={on ? 'step' : undefined}
              aria-label={`Question ${i + 1}${c ? (c.is_correct ? ' (juste)' : ' (fausse)') : ' (pas encore corrigée)'}`}
              className="flex h-6 flex-1 items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              <span className={`w-full rounded-full transition-all ${tone} ${on ? 'h-2.5 ring-2 ring-ink/15' : 'h-1.5'}`} />
            </button>
          );
        })}
      </nav>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-7" aria-labelledby="quiz-question">
        <DifficultyMark value={q.difficulty} />
        <h2 id="quiz-question" className="mt-3 text-[17px] font-semibold leading-relaxed text-ink sm:text-[18px]">
          <MathText text={q.question} />
        </h2>
        <div role="radiogroup" aria-labelledby="quiz-question" className="mt-5 flex flex-col gap-2.5">
          {q.options.map((opt, i) => {
            const selected = answer === i;
            const right = correction && i === correction.correct_answer;
            const wrong = correction && selected && !correction.is_correct;
            const box = right ? 'border-brand bg-brand-soft'
              : wrong ? 'border-[#e3b4ae] bg-[#fdf6f5]'
                : correction ? 'border-line bg-white opacity-60'
                  : selected ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-[#cfc9bf] hover:bg-[#fcfbf9]';
            const dot = right ? 'bg-brand text-white' : wrong ? 'bg-[#a23b34] text-white'
              : selected && !correction ? 'bg-brand text-white' : 'border border-[#d8d4cc] text-ink-faint';
            return (
              <button key={i} type="button" role="radio" aria-checked={selected} onClick={() => choose(i)} aria-disabled={!!correction}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${box} ${correction ? 'cursor-default' : ''}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${dot}`} aria-hidden>
                  {right ? <Check className="h-4 w-4" /> : wrong ? <X className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                </span>
                <MathText text={opt} className={`min-w-0 flex-1 text-[15px] leading-snug ${selected || right ? 'font-semibold text-ink' : 'text-ink-soft'}`} />
                {i < 9 && !correction && <span className="hidden sm:inline-flex" aria-hidden><Kbd>{i + 1}</Kbd></span>}
              </button>
            );
          })}
        </div>
        {correction && <Feedback c={correction} q={q} />}
        {checkError && (
          <p role="alert" className="mt-4 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3 text-[13.5px] text-[#a23b34]">
            La correction n’a pas pu se charger : vérifie ta connexion, puis appuie à nouveau sur « Valider ».
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0}
            className="fd-btn-ghost min-h-11 text-[13px] disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Précédent
          </button>
          {!correction ? (
            answer === undefined ? (
              <button type="button" onClick={() => go(isLast ? (missing.find((i) => i !== index) ?? index) : index + 1)}
                disabled={isLast && missing.length <= 1} className="fd-btn-ghost min-h-11 text-[13px] disabled:opacity-40">
                Y revenir plus tard <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button type="button" onClick={validate} disabled={checking || timeUp} className="fd-btn-primary min-h-11 px-6 text-[14px]">
                {checking ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Correction…</> : <><Check className="h-4 w-4" aria-hidden /> Valider</>}
              </button>
            )
          ) : isLast && complete ? (
            <button type="button" onClick={() => submit()} disabled={submitting} className="fd-btn-primary min-h-11 px-6 text-[14px]">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Envoi…</> : 'Voir mon bilan'}
            </button>
          ) : (
            <button type="button" onClick={advance} className="fd-btn-primary min-h-11 px-6 text-[14px]">
              {isLast ? `Aller à la question ${missing[0] + 1}` : 'Question suivante'} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        {isLast && !complete && correction && (
          <p className="text-right text-[13px] text-ink-faint">{plural(missing.length, 'question')} pas encore corrigée{missing.length > 1 ? 's' : ''}.</p>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
            <p className="flex-1 text-[13.5px] text-[#a23b34]">Ton quiz n’a pas pu être envoyé : vérifie ta connexion.</p>
            <button type="button" onClick={() => submit(true)} className="fd-btn-ghost min-h-9 text-[13px]">Réessayer</button>
          </div>
        )}
        <p className="mt-2 hidden items-center justify-center gap-1.5 text-[12px] text-ink-faint sm:flex">
          <Kbd>1</Kbd>à<Kbd>{Math.min(q.options.length, 9)}</Kbd> pour répondre · <Kbd>Entrée</Kbd> pour valider puis continuer · <Kbd>←</Kbd><Kbd>→</Kbd> pour changer de question
        </p>
      </div>
    </div>
  );
};
