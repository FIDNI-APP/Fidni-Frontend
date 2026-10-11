// Passage d'un quiz, en mise en page « focus » : une question à la fois, grandes réponses, clavier (1 à 4, Entrée,
// ← →). Une question peut être laissée pour plus tard ; « Terminer » dit ce qui manque. Quitter avec des réponses
// demande confirmation (elles seraient perdues).
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useHideMobileTabBar } from '@/components/layout/nav';
import { submitQuiz } from './api';
import { MathText } from './MathText';
import { DIFFICULTY, plural, type ActiveQuiz, type Difficulty, type QuizQuestion, type SkillAssessment } from './types';

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

export const QuizRunner: React.FC<{
  quiz: ActiveQuiz;
  questions: QuizQuestion[];
  onQuit: () => void;
  onDone: (result: SkillAssessment) => void;
}> = ({ quiz, questions, onQuit, onDone }) => {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [startedAt] = useState(() => Date.now());
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  // Mise en page « focus » : pas de barre d'onglets du téléphone pendant le quiz.
  useHideMobileTabBar(true);
  const stayRef = useRef<HTMLButtonElement>(null);

  const total = questions.length;
  const q = questions[index];
  const answer = answers[q.id];
  const missing = questions.flatMap((x, i) => (answers[x.id] === undefined ? [i] : []));
  const answered = total - missing.length;
  const complete = missing.length === 0;
  const isLast = index === total - 1;

  const go = (i: number) => setIndex(Math.max(0, Math.min(total - 1, i)));
  const choose = (i: number) => setAnswers((a) => ({ ...a, [q.id]: i }));

  const submit = async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      onDone(await submitQuiz(quiz.id, answers, Math.floor((Date.now() - startedAt) / 1000)));
    } catch {
      setError(true);
      setSubmitting(false);
    }
  };

  /** Entrée : question suivante ; à la dernière, envoyer (ou aller à la première question sans réponse). */
  const advance = () => {
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

  // Clavier : 1 à 4 (ou A à D) répondent, Entrée continue, ← → changent de question.
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div ref={topRef} className="flex scroll-mt-24 items-center justify-between gap-3">
        <button type="button" onClick={quit}
          className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 pr-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Quitter
        </button>
        <span className="fd-nums text-[13px] font-semibold text-ink-soft" aria-live="polite">Question {index + 1} sur {total}</span>
      </div>

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

      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">Quiz{quiz.subject ? ` · ${quiz.subject}` : ''}</p>
        <h1 className="fd-display mt-1.5 text-[24px] leading-tight text-ink sm:text-[28px]">{quiz.name}</h1>
      </header>

      <nav aria-label="Questions" className="-my-1 flex gap-1">
        {questions.map((x, i) => {
          const on = i === index;
          const done = answers[x.id] !== undefined;
          return (
            <button key={x.id} type="button" onClick={() => go(i)} aria-current={on ? 'step' : undefined}
              aria-label={`Question ${i + 1}${done ? '' : ' (sans réponse)'}`}
              className="flex h-6 flex-1 items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              <span className={`h-1.5 w-full rounded-full transition-colors ${on ? 'bg-brand' : done ? 'bg-brand/45' : 'bg-line'}`} />
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
            return (
              <button key={i} type="button" role="radio" aria-checked={selected} onClick={() => choose(i)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  selected ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-[#cfc9bf] hover:bg-[#fcfbf9]'}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${
                  selected ? 'bg-brand text-white' : 'border border-[#d8d4cc] text-ink-faint'}`} aria-hidden>
                  {String.fromCharCode(65 + i)}
                </span>
                <MathText text={opt} className={`min-w-0 flex-1 text-[15px] leading-snug ${selected ? 'font-semibold text-ink' : 'text-ink-soft'}`} />
                {i < 9 && <span className="hidden sm:inline-flex" aria-hidden><Kbd>{i + 1}</Kbd></span>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0}
            className="fd-btn-ghost min-h-11 text-[13px] disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Précédent
          </button>
          {isLast ? (
            <button type="button" onClick={submit} disabled={!complete || submitting} aria-describedby={complete ? undefined : 'quiz-missing'}
              className="fd-btn-primary min-h-11 px-6 text-[14px] disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Envoi…</> : 'Terminer'}
            </button>
          ) : answer === undefined ? (
            <button type="button" onClick={() => go(index + 1)} className="fd-btn-ghost min-h-11 text-[13px]">
              Y revenir plus tard <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button type="button" onClick={() => go(index + 1)} className="fd-btn-primary min-h-11 px-6 text-[14px]">
              Suivant <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        {isLast && !complete && (
          <p id="quiz-missing" className="text-right text-[13px] text-ink-faint">
            {plural(missing.length, 'question')} sans réponse ·{' '}
            <button type="button" onClick={() => go(missing[0])} className="inline-flex min-h-10 items-center font-semibold text-brand-hover hover:underline">
              Aller à la question {missing[0] + 1}
            </button>
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3 text-[13.5px] text-[#a23b34]">
            Ton quiz n’a pas pu être envoyé : vérifie ta connexion, puis appuie à nouveau sur « Terminer ».
          </p>
        )}
        <p className="mt-2 hidden items-center justify-center gap-1.5 text-[12px] text-ink-faint sm:flex">
          <Kbd>1</Kbd>à<Kbd>{Math.min(q.options.length, 9)}</Kbd> pour répondre · <Kbd>Entrée</Kbd> pour continuer · <Kbd>←</Kbd><Kbd>→</Kbd> pour changer de question
        </p>
      </div>
    </div>
  );
};
