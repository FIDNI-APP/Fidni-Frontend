// Passage d'un quiz, en plein écran (« focus », refait le 31/10/2026) : le site disparaît, il reste la question.
//  - En haut : quitter (le passage est gardé sur le serveur), une barre d'un segment par question (vert : juste, or :
//    faux, encre : la question en cours ; un clic y va) et le numéro.
//  - Au centre : l'énoncé (texte courant pour un long problème), les réponses en grandes cases, puis l'explication.
//  - En bas : « Valider » ; après la correction, la barre prend la couleur du résultat et propose « Continuer ».
// Corrigé question par question (POST /skill-assessments/verifier/<id>/), réponse verrouillée ; pas de chronomètre
// (le temps est seulement mesuré, hors correction, pour les statistiques) ; reprise d'un passage commencé (`initial`,
// `left`). Plusieurs bonnes réponses (`nb_bonnes` > 1) : cases à cocher, juste seulement si ce sont exactement les
// bonnes. Clavier : 1 à 6 (ou A à F) pour répondre, Entrée pour valider puis continuer, ← → pour changer de question.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, ChevronLeft, Loader2, RotateCcw, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useHideMobileTabBar } from '@/components/layout/nav';
import { checkAnswer, submitQuiz } from './api';
import { MathText } from './MathText';
import { ExplanationBox } from './QuizRow';
import { QUIZ_TYPE } from './quizTypes';
import { t } from '@/i18n';
import { goodAnswers, picked, toPick, typeOf, type ActiveQuiz, type Answer, type CorrectionItem, type QuizQuestion, type SkillAssessment } from './types';

/** Au-delà, un énoncé est un vrai problème : texte courant plutôt que gras. */
const LONG_STATEMENT = 220;

const letter = (i: number) => String.fromCharCode(65 + i);

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-paper px-1.5 font-sans text-[11px] font-semibold text-ink-faint">
    {children}
  </kbd>
);

/** Le cadre plein écran : rendu à la racine du document (au-dessus du site), défilement de la page bloqué. */
const Focus: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  useHideMobileTabBar(true);
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = before; };
  }, []);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[60] flex flex-col bg-paper">{children}</div>,
    document.body,
  );
};

/** En-tête du plein écran : quitter, la barre des questions, le numéro. */
const Top: React.FC<{ onQuit: () => void; children?: React.ReactNode; count?: React.ReactNode }> = ({ onQuit, children, count }) => (
  <header className="shrink-0 border-b border-line pt-[env(safe-area-inset-top)]">
    <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-3 sm:px-4">
      <button type="button" onClick={onQuit} aria-label={t('Quitter le quiz')} title={t('Le passage est gardé')}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <X className="h-5 w-5" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      {count}
    </div>
  </header>
);

/** Chargement des questions : le même cadre, vide. */
export const RunnerSkeleton: React.FC<{ name: string; onQuit: () => void }> = ({ name, onQuit }) => (
  <Focus label={name}>
    <Top onQuit={onQuit}><div className="h-1.5 w-full animate-pulse rounded-full bg-line" /></Top>
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8" role="status" aria-label={t('Chargement')}>
      <p className="text-[12px] font-semibold text-ink-faint">{name}</p>
      <div className="mt-4 h-5 w-11/12 animate-pulse rounded bg-[#efece6]" />
      <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-[#efece6]" />
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-white" />)}
      </div>
    </div>
  </Focus>
);

export const QuizRunner: React.FC<{
  quiz: ActiveQuiz;
  questions: QuizQuestion[];
  /** Durée prévue et temps restant donnés par le serveur (reprise : le temps déjà passé = seconds − left), en secondes. */
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
  const [answers, setAnswers] = useState<Record<number, Answer>>(() =>
    Object.fromEntries(initial.filter((c) => picked(c.your_answer).length > 0).map((c) => [c.id, c.your_answer as Answer])));
  const [checked, setChecked] = useState<Record<number, CorrectionItem>>(known);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<'' | 'reseau' | 'expire'>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const total = questions.length;
  const q = questions[index];
  const answer = answers[q.id];
  const correction = checked[q.id];
  const need = toPick(q);
  const multi = need > 1;
  const sel = picked(answer);
  const ready = multi ? sel.length === need : sel.length > 0;
  const rightSet = correction ? goodAnswers(correction) : [];
  const missing = questions.flatMap((x, i) => (checked[x.id] ? [] : [i]));
  const complete = missing.length === 0;
  const isLast = index === total - 1;
  // Le temps passé n'est compté que sur une question pas encore corrigée.
  const paused = !!correction || submitting;
  const type = typeOf(quiz);
  const TypeIcon = QUIZ_TYPE[type].icon;
  const long = q.question.length > LONG_STATEMENT;

  const go = (i: number) => { setCheckError(false); setIndex(Math.max(0, Math.min(total - 1, i))); };
  /** Une réponse : la choisir ; plusieurs : cocher / décocher (pas plus que le nombre de bonnes réponses). */
  const choose = (i: number) => {
    if (correction) return;
    if (!multi) { setAnswers((a) => ({ ...a, [q.id]: i })); return; }
    const next = sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < need ? [...sel, i].sort((a, b) => a - b) : sel;
    setAnswers((a) => ({ ...a, [q.id]: next }));
  };

  // Temps consommé (ms), cumulé tic après tic : les navigateurs ralentissent les minuteries des onglets en arrière-plan,
  // le décompte reste juste puisqu'il additionne le temps réellement écoulé entre deux tics. Reprise : le temps déjà pris.
  const used = useRef((seconds - leftAtStart) * 1000);
  const lastTick = useRef(Date.now());
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const submit = useCallback(async () => {
    if (submitting || !complete) return;
    setSubmitting(true);
    setError('');
    // Sans réponse : -1, compté faux par le serveur (qui note de toute façon toutes les questions du passage).
    const all = Object.fromEntries(questions.map((x) => [x.id, picked(answers[x.id]).length ? answers[x.id] : -1]));
    try {
      onDone(await submitQuiz(quiz, all, Math.round(used.current / 1000)));
    } catch (e) {
      setError(isAxiosError(e) && e.response?.status === 409 ? 'expire' : 'reseau');
      setSubmitting(false);
    }
  }, [submitting, complete, questions, answers, quiz, onDone]);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (!pausedRef.current) used.current += now - lastTick.current;
      lastTick.current = now;
    };
    const timer = setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);

  const validate = async () => {
    if (!ready || correction || checking) return;
    setChecking(true);
    setCheckError(false);
    try {
      const c = await checkAnswer(q.id, multi ? sel : sel[0], Math.round(used.current / 1000));
      setChecked((m) => ({ ...m, [q.id]: c }));
    } catch {
      setCheckError(true);
    } finally {
      setChecking(false);
    }
  };

  /** Entrée : valider la réponse, puis passer à la suite (à la fin : le résultat, ou la première question restante). */
  const advance = () => {
    if (!correction) { if (ready) validate(); return; }
    if (!isLast) go(index + 1);
    else if (complete) submit();
    else go(missing[0]);
  };

  // Nouvelle question : on repart du haut.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [index]);
  // Après la correction : l'explication, sous les réponses, entre dans l'écran.
  useEffect(() => {
    if (correction) document.getElementById('quiz-explication')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [correction]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || submitting) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const pick = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : /^[a-f]$/i.test(e.key) ? e.key.toLowerCase().charCodeAt(0) - 97 : -1;
      if (pick >= 0) {
        if (pick < q.options.length) { e.preventDefault(); choose(pick); }
        return;
      }
      if (e.key === 'Enter') {
        // Sur un bouton (Quitter, une question de la barre…), Entrée garde son effet ; sur une réponse, elle continue.
        const control = el?.closest('button, a, summary');
        if (control && !['radio', 'checkbox'].includes(control.getAttribute('role') ?? '')) return;
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

  const correct = !!correction?.is_correct;
  const lettres = rightSet.map(letter).join(', ');
  const primary = !correction ? (
    <button type="button" onClick={validate} disabled={!ready || checking}
      className="fd-btn-primary min-h-12 min-w-[9.5rem] justify-center px-6 text-[15px] disabled:opacity-40">
      {checking ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('Correction…')}</> : t('Valider')}
    </button>
  ) : (
    <button type="button" onClick={advance} disabled={submitting}
      className="fd-btn-primary min-h-12 min-w-[9.5rem] justify-center px-6 text-[15px]">
      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('Envoi…')}</>
        : isLast && complete ? t('Voir mon résultat')
          : isLast ? t('Question {n}', { n: missing[0] + 1 })
            : <>{t('Continuer')} <ArrowRight className="h-4 w-4" aria-hidden /></>}
    </button>
  );

  return (
    <Focus label={`${t(QUIZ_TYPE[type].label)} · ${quiz.name}`}>
      <Top onQuit={onQuit} count={(
        <span className="fd-nums shrink-0 text-[13px] font-semibold text-ink" aria-live="polite">
          {index + 1}<span className="font-normal text-ink-faint">/{total}</span>
        </span>
      )}>
        {/* Un segment par question : vert juste, or faux, encre la question en cours ; un clic y va. */}
        <div className="flex w-full items-center gap-[3px]" role="group" aria-label={t('Questions du quiz')}>
          {questions.map((x, i) => {
            const c = checked[x.id];
            const tone = c ? (c.is_correct ? 'bg-brand' : 'bg-gold') : i === index ? 'bg-ink' : 'bg-line';
            return (
              <button key={x.id} type="button" onClick={() => go(i)} aria-current={i === index ? 'step' : undefined}
                aria-label={c ? (c.is_correct ? t('Question {n}, juste', { n: i + 1 }) : t('Question {n}, fausse', { n: i + 1 }))
                  : t('Question {n}, pas encore corrigée', { n: i + 1 })}
                className="group flex h-8 min-w-0 flex-1 items-center focus:outline-none">
                <span className={`h-1.5 w-full rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-brand/40 ${tone} ${
                  i === index ? '' : 'group-hover:opacity-70'}`} />
              </button>
            );
          })}
        </div>
      </Top>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6 sm:pt-10">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-faint">
            <TypeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{t(QUIZ_TYPE[type].label)} · {quiz.name}</span>
          </p>
          <h2 id="quiz-question" className={`mt-3 text-ink ${long
            ? 'text-[16.5px] font-normal leading-[1.75]'
            : 'text-[19px] font-semibold leading-relaxed sm:text-[21px]'}`}>
            <MathText text={q.question} className="fd-latex" />
          </h2>
          {multi && (
            <p id="quiz-consigne" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-ink-soft ring-1 ring-line">
              {t('Choisis {n} réponses', { n: need })}
              {!correction && <span className="fd-nums font-normal text-ink-faint">{sel.length}/{need}</span>}
            </p>
          )}

          <div role={multi ? 'group' : 'radiogroup'} aria-labelledby="quiz-question" aria-describedby={multi ? 'quiz-consigne' : undefined}
            className="mt-6 flex flex-col gap-3">
            {q.options.map((opt, i) => {
              const selected = sel.includes(i);
              const right = !!correction && rightSet.includes(i);
              const wrong = !!correction && selected && !right;
              const box = right ? 'border-brand bg-brand-soft'
                : wrong ? 'border-gold bg-gold-soft'
                  : correction ? 'border-line bg-white opacity-50'
                    : selected ? 'border-ink bg-white shadow-[0_4px_14px_rgba(20,18,16,.08)]'
                      : 'border-line bg-white hover:border-[#cfc9bf]';
              const dot = right ? 'bg-brand text-white' : wrong ? 'bg-gold text-white'
                : selected && !correction ? 'bg-ink text-white' : 'bg-paper text-ink-soft ring-1 ring-line';
              return (
                <button key={i} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={selected} onClick={() => choose(i)}
                  aria-disabled={!!correction}
                  className={`flex min-h-[64px] w-full items-center gap-4 rounded-2xl border-2 px-4 py-3 text-start transition-[border-color,background-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${box} ${correction ? 'cursor-default' : ''}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center text-[14px] font-bold ${multi ? 'rounded-lg' : 'rounded-full'} ${dot}`} aria-hidden>
                    {right ? <Check className="h-4 w-4" /> : wrong ? <X className="h-4 w-4" /> : multi && selected ? <Check className="h-4 w-4" /> : letter(i)}
                  </span>
                  <MathText text={opt} className={`fd-latex min-w-0 flex-1 text-[16px] leading-snug ${selected || right ? 'font-semibold text-ink' : 'text-ink-soft'}`} />
                  {multi && right && !selected && <span className="shrink-0 text-[12px] font-semibold text-ink-faint">{t('oubliée')}</span>}
                  {i < 9 && !correction && <span className="hidden sm:inline-flex" aria-hidden><Kbd>{i + 1}</Kbd></span>}
                </button>
              );
            })}
          </div>

          {correction && (
            <ExplanationBox id="quiz-explication" ok={correct} text={correction.explanation} theoremes={correction.theoremes}
              className="mt-6 scroll-mb-4 sm:p-5" />
          )}
          {checkError && (
            <p role="alert" className="mt-5 rounded-xl border border-gold-line bg-gold-soft px-4 py-3 text-[13.5px] text-gold-strong">
              {t('La correction n’a pas pu se charger. Vérifie ta connexion, puis valide à nouveau.')}
            </p>
          )}
        </div>
      </div>

      <footer className={`shrink-0 border-t pb-[max(12px,env(safe-area-inset-bottom))] pt-3 transition-colors ${
        !correction ? 'border-line bg-white' : correct ? 'border-brand-line bg-brand-soft' : 'border-gold-line bg-gold-soft'}`}>
        {error && (
          <div role="alert" className="mx-auto mb-3 flex w-full max-w-2xl flex-wrap items-center gap-3 px-4">
            <p className="flex-1 text-[13.5px] text-gold-strong">
              {error === 'expire' ? t('Ce passage a expiré (commencé il y a plus de 24 h).') : t('L’envoi a échoué. Vérifie ta connexion.')}
            </p>
            {error === 'expire'
              ? <button type="button" onClick={onRestart} className="fd-btn-ghost min-h-9 text-[13px]"><RotateCcw className="h-4 w-4" aria-hidden /> {t('Recommencer')}</button>
              : <button type="button" onClick={() => submit()} className="fd-btn-ghost min-h-9 text-[13px]">{t('Réessayer')}</button>}
          </div>
        )}
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4">
          {correction ? (
            <p role="status" className="flex min-w-0 flex-1 items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${correct ? 'bg-brand' : 'bg-gold'}`} aria-hidden>
                {correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-[16px] font-bold leading-tight ${correct ? 'text-brand-hover' : 'text-gold-strong'}`}>
                  {correct ? t('Bonne réponse') : t('Mauvaise réponse')}
                </span>
                {!correct && (
                  <span className="mt-0.5 block text-[13px] text-ink-soft">
                    {rightSet.length > 1 ? t('Bonnes réponses : {lettres}', { lettres }) : t('Bonne réponse : {lettre}', { lettre: lettres })}
                  </span>
                )}
              </span>
            </p>
          ) : (
            <div className="flex flex-1 items-center gap-2">
              {index > 0 && (
                <button type="button" onClick={() => go(index - 1)} aria-label={t('Question précédente')}
                  className="fd-btn-ghost min-h-12 px-3"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
              )}
              <button type="button" onClick={() => go(isLast ? (missing.find((i) => i !== index) ?? index) : index + 1)}
                disabled={isLast && missing.length <= 1} className="fd-btn-ghost min-h-12 text-[13.5px] disabled:opacity-40">
                {t('Passer')}
              </button>
            </div>
          )}
          {primary}
        </div>
        {!correction && (
          <p className="mx-auto mt-2 hidden w-full max-w-2xl items-center justify-end gap-1.5 px-4 text-[11.5px] text-ink-faint sm:flex">
            <Kbd>1</Kbd>–<Kbd>{Math.min(q.options.length, 9)}</Kbd> {t('répondre')} · <Kbd>{t('Entrée')}</Kbd> {t('valider')} · <Kbd>←</Kbd><Kbd>→</Kbd> {t('naviguer')}
          </p>
        )}
      </footer>
    </Focus>
  );
};
