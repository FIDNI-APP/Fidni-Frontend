// Passage d'un quiz, en mise en page « focus » : une question à la fois, grandes réponses, clavier (1 à 4, Entrée,
// ← →). Depuis le 13/10/2026, façon concours :
//  - un minuteur (1 min par question, donné par le serveur), qui s'arrête pendant la correction de chaque question ;
//    à zéro, le quiz est envoyé tel quel (une question sans réponse compte comme fausse) ;
//  - « Valider » corrige la question tout de suite (POST /skill-assessments/verifier/<id>/) : bonne réponse,
//    explication, théorème ; la réponse est alors verrouillée (côté serveur aussi).
// 14/10/2026 : le passage est gardé sur le serveur. Quitter ne perd rien : on reprend à la première question pas encore
// corrigée, avec les corrections déjà vues et le temps restant (`initial`, `left`). Une barre fine et une grille
// (numéros des questions) remplacent la rangée de 30 segments ; sur téléphone, les boutons restent en bas de l'écran.
// Textes en police LaTeX (.fd-latex) ; la difficulté des questions n'est pas montrée (elle ne sert qu'au score).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ChevronDown, ChevronLeft, Clock, LayoutGrid, Loader2, Pause, RotateCcw, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useHideMobileTabBar } from '@/components/layout/nav';
import { checkAnswer, submitQuiz } from './api';
import { MathText } from './MathText';
import { plural, type ActiveQuiz, type CorrectionItem, type QuizQuestion, type SkillAssessment } from './types';

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-[#faf9f7] px-1.5 font-sans text-[11px] font-semibold text-ink-faint">
    {children}
  </kbd>
);

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const letter = (i: number) => String.fromCharCode(65 + i);

/** Minuteur : temps restant ; « en pause » pendant la correction ; plus visible sous la dernière minute. */
const Timer: React.FC<{ left: number; paused: boolean }> = ({ left, paused }) => {
  const low = left <= 60 && !paused;
  return (
    <span role="timer" aria-label={`Temps restant : ${clock(left)}${paused ? ', en pause' : ''}`}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
        low ? 'border-gold-line bg-gold-soft text-[#8a6318]' : paused ? 'border-line bg-[#f7f6f3] text-ink-faint' : 'border-line bg-white text-ink'}`}>
      {low ? <AlertTriangle className="h-4 w-4" aria-hidden /> : paused ? <Pause className="h-4 w-4" aria-hidden /> : <Clock className="h-4 w-4" aria-hidden />}
      <span className="fd-nums text-[15px] font-bold tracking-wide">{clock(left)}</span>
      {paused && <span className="hidden text-[11.5px] font-medium sm:inline">en pause</span>}
    </span>
  );
};

/** Correction de la question, juste après « Valider » (or pour une erreur : ce n'est pas une faute). */
const Feedback: React.FC<{ c: CorrectionItem; q: QuizQuestion }> = ({ c, q }) => (
  <div role="status" className={`mt-5 rounded-2xl border p-4 ${c.is_correct ? 'border-brand/30 bg-brand-soft/50' : 'border-gold-line bg-gold-soft/60'}`}>
    <p className={`flex items-center gap-1.5 text-[14px] font-semibold ${c.is_correct ? 'text-brand-hover' : 'text-[#8a6318]'}`}>
      {c.is_correct ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
      {c.is_correct ? 'Bonne réponse' : <>Pas tout à fait : la bonne réponse est {letter(c.correct_answer)}</>}
    </p>
    {!c.is_correct && (
      <p className="mt-1 text-[13.5px] font-semibold text-ink"><MathText text={q.options[c.correct_answer] ?? ''} className="fd-latex" /></p>
    )}
    {c.explanation && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft"><MathText text={c.explanation} className="fd-latex" /></p>}
    {c.theoremes && c.theoremes.length > 0 && (
      <p className="mt-2.5 flex flex-wrap gap-1.5">
        {c.theoremes.map((t) => <span key={t} className="rounded-full bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-ink-soft ring-1 ring-line">{t}</span>)}
      </p>
    )}
  </div>
);

/** Grille des questions : un numéro par question, sa couleur dit où l'on en est ; un clic y va. */
const Grid: React.FC<{
  questions: QuizQuestion[]; index: number; checked: Record<number, CorrectionItem>; answers: Record<number, number>;
  onGo: (i: number) => void;
}> = ({ questions, index, checked, answers, onGo }) => (
  <div className="grid grid-cols-6 gap-1.5 rounded-2xl border border-line bg-white p-3 sm:grid-cols-10">
    {questions.map((x, i) => {
      const c = checked[x.id];
      const on = i === index;
      const tone = c ? (c.is_correct ? 'bg-brand text-white border-brand' : 'bg-gold text-white border-gold')
        : answers[x.id] !== undefined ? 'bg-brand-soft text-brand-hover border-brand/40' : 'bg-white text-ink-soft border-line';
      return (
        <button key={x.id} type="button" onClick={() => onGo(i)} aria-current={on ? 'step' : undefined}
          aria-label={`Question ${i + 1}${c ? (c.is_correct ? ', juste' : ', fausse') : ', pas encore corrigée'}`}
          className={`fd-nums flex h-9 items-center justify-center rounded-lg border text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${tone} ${on ? 'ring-2 ring-ink/30 ring-offset-1' : ''}`}>
          {i + 1}
        </button>
      );
    })}
  </div>
);

export const QuizRunner: React.FC<{
  quiz: ActiveQuiz;
  questions: QuizQuestion[];
  /** Durée du minuteur et temps restant (reprise d'un passage commencé), en secondes. */
  seconds: number;
  left?: number;
  /** Corrections déjà données (reprise). */
  initial?: CorrectionItem[];
  onQuit: () => void;
  /** Le passage n'existe plus côté serveur (expiré) : un nouveau tirage. */
  onRestart: () => void;
  onDone: (result: SkillAssessment) => void;
}> = ({ quiz, questions, seconds, left: leftAtStart = seconds, initial = [], onQuit, onRestart, onDone }) => {
  const known = Object.fromEntries(initial.map((c) => [c.id, c])) as Record<number, CorrectionItem>;
  const firstOpen = Math.max(0, questions.findIndex((x) => !known[x.id]));
  const [index, setIndex] = useState(firstOpen);
  const [answers, setAnswers] = useState<Record<number, number>>(() =>
    Object.fromEntries(initial.filter((c) => c.your_answer !== null && c.your_answer >= 0).map((c) => [c.id, c.your_answer as number])));
  const [checked, setChecked] = useState<Record<number, CorrectionItem>>(known);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [left, setLeft] = useState(leftAtStart);
  const [timeUp, setTimeUp] = useState(false);
  const [grid, setGrid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<'' | 'reseau' | 'expire'>('');
  const topRef = useRef<HTMLDivElement>(null);
  // Mise en page « focus » : pas de barre d'onglets du téléphone pendant le quiz.
  useHideMobileTabBar(true);

  const total = questions.length;
  const q = questions[index];
  const answer = answers[q.id];
  const correction = checked[q.id];
  const missing = questions.flatMap((x, i) => (checked[x.id] ? [] : [i]));
  const done = total - missing.length;
  const complete = missing.length === 0;
  const isLast = index === total - 1;
  // Le chrono ne tourne que sur une question pas encore corrigée.
  const paused = !!correction || submitting || timeUp;

  const go = (i: number) => { setCheckError(false); setGrid(false); setIndex(Math.max(0, Math.min(total - 1, i))); };
  const choose = (i: number) => { if (!correction) setAnswers((a) => ({ ...a, [q.id]: i })); };

  // Temps consommé (ms), cumulé tic après tic : les navigateurs ralentissent les minuteries des onglets en arrière-plan,
  // le décompte reste juste puisqu'il additionne le temps réellement écoulé entre deux tics. Reprise : le temps déjà pris.
  const used = useRef((seconds - leftAtStart) * 1000);
  const lastTick = useRef(Date.now());
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const submit = useCallback(async (force = false) => {
    if (submitting || (!force && !complete)) return;
    setSubmitting(true);
    setError('');
    // Sans réponse : -1, compté faux par le serveur (qui note de toute façon toutes les questions du passage).
    const all = Object.fromEntries(questions.map((x) => [x.id, answers[x.id] ?? -1]));
    try {
      onDone(await submitQuiz(quiz.id, quiz.levelId, all, Math.round(used.current / 1000)));
    } catch (e) {
      setError(isAxiosError(e) && e.response?.status === 409 ? 'expire' : 'reseau');
      setSubmitting(false);
    }
  }, [submitting, complete, questions, answers, quiz.id, quiz.levelId, onDone]);
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
      const c = await checkAnswer(q.id, answer, Math.round(used.current / 1000));
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

  // Nouvelle question : on remonte à l'en-tête si on l'a perdu de vue (téléphone).
  useEffect(() => {
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [index]);

  // Clavier : 1 à 4 (ou A à D) répondent, Entrée valide puis continue, ← → changent de question.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || submitting) return;
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

  // Action principale de la barre du bas : Valider → Question suivante → Voir mon bilan.
  const primary = !correction ? (
    <button type="button" onClick={validate} disabled={answer === undefined || checking || timeUp}
      className="fd-btn-primary min-h-12 flex-1 justify-center px-6 text-[15px] disabled:opacity-50 sm:flex-none">
      {checking ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Correction…</> : <><Check className="h-4 w-4" aria-hidden /> Valider</>}
    </button>
  ) : isLast && complete ? (
    <button type="button" onClick={() => submit()} disabled={submitting} className="fd-btn-primary min-h-12 flex-1 justify-center px-6 text-[15px] sm:flex-none">
      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Envoi…</> : 'Voir mon bilan'}
    </button>
  ) : (
    <button type="button" onClick={advance} className="fd-btn-primary min-h-12 flex-1 justify-center px-6 text-[15px] sm:flex-none">
      {isLast ? `Question ${missing[0] + 1}` : 'Suivante'} <ArrowRight className="h-4 w-4" aria-hidden />
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div ref={topRef} className="flex scroll-mt-24 items-center justify-between gap-3">
        <button type="button" onClick={onQuit} title="Tu pourras reprendre là où tu t’es arrêté"
          className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 pr-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Quitter
        </button>
        <Timer left={left} paused={!!correction && !timeUp} />
      </div>

      <header className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">Quiz{quiz.subject ? ` · ${quiz.subject}` : ''}</p>
        <h1 className="fd-display mt-1 text-[22px] leading-tight text-ink sm:text-[26px]">{quiz.name}</h1>
      </header>

      {/* Avancement : une barre fine, « Question 7/30 », et la grille pour aller à une question. */}
      <div>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="fd-nums font-semibold text-ink" aria-live="polite">Question {index + 1}<span className="font-normal text-ink-faint">/{total}</span></span>
          <span className="flex items-center gap-3">
            {done > 0 && <span className="fd-nums text-ink-soft"><b className="text-ink">{good}</b> bonne{good > 1 ? 's' : ''} réponse{good > 1 ? 's' : ''}</span>}
            <button type="button" onClick={() => setGrid((v) => !v)} aria-expanded={grid}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-medium text-ink-soft hover:bg-paper hover:text-ink">
              <LayoutGrid className="h-4 w-4" aria-hidden /> Grille <ChevronDown className={`h-3.5 w-3.5 transition-transform ${grid ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efece6]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
          aria-label={`${done} questions corrigées sur ${total}`}>
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        {grid && <div className="mt-2"><Grid questions={questions} index={index} checked={checked} answers={answers} onGo={go} /></div>}
      </div>

      {timeUp && (
        <div role="alert" className="rounded-2xl border border-gold-line bg-gold-soft p-4 text-[13.5px] text-ink">
          <b className="font-semibold">Temps écoulé.</b> Ton quiz est envoyé tel quel : les questions sans réponse comptent comme fausses.
        </div>
      )}

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-7" aria-labelledby="quiz-question">
        <h2 id="quiz-question" className="text-[17px] font-semibold leading-relaxed text-ink sm:text-[18px]">
          <MathText text={q.question} className="fd-latex" />
        </h2>
        <div role="radiogroup" aria-labelledby="quiz-question" className="mt-5 flex flex-col gap-2.5">
          {q.options.map((opt, i) => {
            const selected = answer === i;
            const right = correction && i === correction.correct_answer;
            const wrong = correction && selected && !correction.is_correct;
            const box = right ? 'border-brand bg-brand-soft'
              : wrong ? 'border-gold bg-gold-soft'
                : correction ? 'border-line bg-white opacity-55'
                  : selected ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line bg-white hover:border-[#cfc9bf] hover:bg-[#fcfbf9]';
            const dot = right ? 'bg-brand text-white' : wrong ? 'bg-gold text-white'
              : selected && !correction ? 'bg-brand text-white' : 'border border-[#d8d4cc] bg-white text-ink-soft';
            return (
              <button key={i} type="button" role="radio" aria-checked={selected} onClick={() => choose(i)} aria-disabled={!!correction}
                className={`flex min-h-[60px] w-full items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${box} ${correction ? 'cursor-default' : ''}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold ${dot}`} aria-hidden>
                  {right ? <Check className="h-4 w-4" /> : wrong ? <X className="h-4 w-4" /> : letter(i)}
                </span>
                <MathText text={opt} className={`fd-latex min-w-0 flex-1 text-[15.5px] leading-snug ${selected || right ? 'font-semibold text-ink' : 'text-ink-soft'}`} />
                {i < 9 && !correction && <span className="hidden sm:inline-flex" aria-hidden><Kbd>{i + 1}</Kbd></span>}
              </button>
            );
          })}
        </div>
        {correction && <Feedback c={correction} q={q} />}
        {checkError && (
          <p role="alert" className="mt-4 rounded-xl border border-gold-line bg-gold-soft px-4 py-3 text-[13.5px] text-[#7a560f]">
            La correction n’a pas pu se charger : vérifie ta connexion, puis appuie à nouveau sur « Valider ».
          </p>
        )}
      </section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-gold-line bg-gold-soft px-4 py-3">
          <p className="flex-1 text-[13.5px] text-[#7a560f]">
            {error === 'expire' ? 'Ce quiz a expiré (commencé il y a plus d’un jour) : recommence-le.' : 'Ton quiz n’a pas pu être envoyé : vérifie ta connexion.'}
          </p>
          {error === 'expire'
            ? <button type="button" onClick={onRestart} className="fd-btn-ghost min-h-9 text-[13px]"><RotateCcw className="h-4 w-4" aria-hidden /> Recommencer</button>
            : <button type="button" onClick={() => submit(true)} className="fd-btn-ghost min-h-9 text-[13px]">Réessayer</button>}
        </div>
      )}

      {/* Boutons : en bas de l'écran sur téléphone (toujours à portée du pouce), sous la question sur ordinateur. */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-2 sm:justify-between">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Question précédente"
            className="fd-btn-ghost min-h-12 px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Précédente</span>
          </button>
          <div className="flex flex-1 items-center justify-end gap-2">
            {!correction && (
              <button type="button" onClick={() => go(isLast ? (missing.find((i) => i !== index) ?? index) : index + 1)}
                disabled={isLast && missing.length <= 1} className="fd-btn-ghost min-h-12 text-[13px] disabled:opacity-40">
                Passer
              </button>
            )}
            {primary}
          </div>
        </div>
        {isLast && !complete && correction && (
          <p className="mt-1.5 text-right text-[12.5px] text-ink-faint">{plural(missing.length, 'question')} pas encore corrigée{missing.length > 1 ? 's' : ''}.</p>
        )}
      </div>
      <p className="hidden items-center justify-center gap-1.5 text-[12px] text-ink-faint sm:flex">
        <Kbd>1</Kbd>à<Kbd>{Math.min(q.options.length, 9)}</Kbd> pour répondre · <Kbd>Entrée</Kbd> pour valider puis continuer · <Kbd>←</Kbd><Kbd>→</Kbd> pour changer de question
      </p>
    </div>
  );
};
