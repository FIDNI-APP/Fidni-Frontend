// src/components/profile/SkillIQSection.tsx
// Skill IQ : des quiz courts par chapitre, corrigés tout de suite. Vue principale = les chapitres
// d'une matière du niveau d'un coup d'œil (un onglet par matière dès qu'il y en a plusieurs) ;
// les quiz qui n'existent pas encore sont annoncés comme tels au lieu d'échouer au clic.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Brain, CheckCircle2, XCircle, Play, RotateCcw, ArrowLeft, Loader2, Clock, Award, Hourglass,
} from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';

interface Chapter { id: number; name: string; }
interface Subject { id: number; name: string; chapters: Chapter[]; }
interface ClassLevel { id: number; name: string; subjects: Subject[]; }

interface SkillAssessment {
  id: number; chapter: number; chapter_name: string; subject_name: string;
  score: number; max_score: number; level: Level; completed_at: string;
  correction?: { id: number; your_answer: number | null; correct_answer: number; is_correct: boolean; explanation: string }[];
}
type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';
interface QuizQuestion { id: number; question: string; options: string[]; difficulty: 'easy' | 'medium' | 'hard'; }
interface QuizState { questions: QuizQuestion[]; currentIndex: number; answers: Record<number, number>; startedAt: Date; }

const LEVEL: Record<Level, { label: string; className: string }> = {
  beginner:     { label: 'Débutant',      className: 'bg-[#f2f1ee] text-ink-faint' },
  intermediate: { label: 'Intermédiaire', className: 'bg-brand-soft text-brand-hover' },
  advanced:     { label: 'Avancé',        className: 'bg-gold-soft text-gold-strong' },
  expert:       { label: 'Expert',        className: 'bg-ink text-white' },
};
const DIFFICULTY = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' } as const;

const pct = (a: SkillAssessment) => (a.max_score ? Math.round((a.score / a.max_score) * 100) : 0);
// Texte d'un quiz (écrit à la main, peut contenir $…$) : échappé puis rendu avec KaTeX et filtré.
const mathHtml = (s: string) => renderContentHtml(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
const MathText: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: mathHtml(text) }} />
);
const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export const SkillIQSection: React.FC = () => {
  const { user } = useAuth();
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [available, setAvailable] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<{ chapterId: number; chapterName: string; subjectName?: string } | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [lastQuestions, setLastQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<SkillAssessment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tax, mine, avail] = await Promise.all([
          api.get('/class-levels/?include_taxonomy=true'),
          api.get('/skill-assessments/my/').catch(() => ({ data: [] })),
          api.get('/skill-assessments/available/').catch(() => ({ data: {} })),
        ]);
        const levels: ClassLevel[] = tax.data || [];
        setClassLevels(levels);
        setAssessments(mine.data || []);
        setAvailable(avail.data || {});
        // Niveau de l'élève par défaut, sinon le premier.
        const own = user?.profile?.class_level;
        const ownId = typeof own === 'object' && own ? Number(own.id) : own ? Number(own) : null;
        setLevelId(levels.find((l) => l.id === ownId)?.id ?? levels[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const byChapter = useMemo(() => new Map(assessments.map((a) => [a.chapter, a])), [assessments]);
  const level = classLevels.find((l) => l.id === levelId);
  // Matières du niveau qui ont un programme ; celle qui a le plus de quiz prêts s'ouvre par défaut.
  const subjects = useMemo(() => (level?.subjects ?? []).filter((s) => s.chapters.length > 0), [level]);
  const readyIn = (s: Subject) => s.chapters.filter((c) => available[c.id]).length;
  const subject = subjects.find((s) => s.id === subjectId)
    ?? [...subjects].sort((a, b) => readyIn(b) - readyIn(a))[0];
  const chapters = useMemo(() => {
    const seen = new Set<number>();
    return (subject?.chapters ?? []).filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .sort((a, b) => Number(!available[b.id]) - Number(!available[a.id]) || a.name.localeCompare(b.name, 'fr'));
  }, [subject, available]);
  const availableHere = chapters.filter((c) => available[c.id]).length;
  const average = assessments.length ? Math.round(assessments.reduce((s, a) => s + pct(a), 0) / assessments.length) : null;

  const startQuiz = async (chapterId: number, chapterName: string, subjectName?: string) => {
    setActiveQuiz({ chapterId, chapterName, subjectName });
    setQuizResult(null);
    setQuizLoading(true);
    try {
      const r = await api.get(`/skill-assessments/quiz/${chapterId}/`);
      setQuizState({ questions: r.data.questions, currentIndex: 0, answers: {}, startedAt: new Date() });
      setLastQuestions(r.data.questions);
    } catch {
      setQuizState({ questions: [], currentIndex: 0, answers: {}, startedAt: new Date() });
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizState || !activeQuiz) return;
    setSubmitting(true);
    try {
      const r = await api.post(`/skill-assessments/submit/${activeQuiz.chapterId}/`, {
        answers: quizState.answers,
        time_spent: Math.floor((Date.now() - quizState.startedAt.getTime()) / 1000),
      });
      setQuizResult(r.data);
      setQuizState(null);
      const mine = await api.get('/skill-assessments/my/');
      setAssessments(mine.data || []);
    } finally {
      setSubmitting(false);
    }
  };

  const closeQuiz = () => { setActiveQuiz(null); setQuizState(null); setQuizResult(null); };

  // « Passer le quiz » depuis Ma progression : /skill-iq?chapitre=<id> lance directement ce quiz.
  const [searchParams, setSearchParams] = useSearchParams();
  const wanted = Number(searchParams.get('chapitre')) || null;
  useEffect(() => {
    if (loading || !wanted) return;
    setSearchParams((p) => { const next = new URLSearchParams(p); next.delete('chapitre'); return next; }, { replace: true });
    for (const lv of classLevels) {
      for (const s of lv.subjects) {
        const c = s.chapters.find((x) => x.id === wanted);
        if (c && available[c.id]) { startQuiz(c.id, c.name, s.name); return; }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, wanted]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-ink-faint">
        <Loader2 className="w-7 h-7 animate-spin mb-3" />
        <p className="text-sm">Chargement…</p>
      </div>
    );
  }

  /* ─────────────── Résultat + correction ─────────────── */
  if (activeQuiz && quizResult) {
    const score = pct(quizResult);
    const lv = LEVEL[quizResult.level] ?? LEVEL.beginner;
    const byId = new Map(lastQuestions.map((q) => [q.id, q]));
    const correction = (quizResult.correction ?? []).filter((c) => byId.has(c.id));
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <BackButton onClick={closeQuiz} label="Tous les chapitres" />
        <section className="rounded-2xl border border-line bg-white overflow-hidden">
          <div className="px-6 py-7 bg-[#faf9f7] border-b border-line flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing percentage={score} size={104} strokeWidth={8} trackColor="#e7e3dc" progressColor="#1a7a4a">
              <span className="text-[26px] font-bold text-ink fd-nums">{score}%</span>
            </ProgressRing>
            <div className="text-center sm:text-left">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
                Quiz terminé{activeQuiz.subjectName ? ` · ${activeQuiz.subjectName}` : ''}
              </p>
              <h2 className="fd-display text-[22px] font-semibold text-ink mt-1">{activeQuiz.chapterName}</h2>
              <p className="text-[13.5px] text-ink-faint mt-1 fd-nums">{quizResult.score} / {quizResult.max_score} points (facile 1, moyen 2, difficile 3)</p>
              <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[12.5px] font-semibold ${lv.className}`}>
                <Award className="w-3.5 h-3.5" /> {lv.label}
              </span>
            </div>
          </div>

          {correction.length > 0 && (
            <div className="px-6 py-5">
              <h3 className="text-[14.5px] font-bold text-ink mb-3">
                Correction · {correction.filter((c) => c.is_correct).length} bonne{correction.filter((c) => c.is_correct).length > 1 ? 's' : ''} réponse{correction.filter((c) => c.is_correct).length > 1 ? 's' : ''} sur {correction.length}
              </h3>
              <ol className="flex flex-col gap-3">
                {correction.map((c, i) => {
                  const q = byId.get(c.id)!;
                  return (
                    <li key={c.id} className={`rounded-xl border px-4 py-3 ${c.is_correct ? 'border-brand-line bg-brand-soft/40' : 'border-[#f1d3cf] bg-[#fbecea]/50'}`}>
                      <div className="flex items-start gap-2.5">
                        {c.is_correct
                          ? <CheckCircle2 className="w-[18px] h-[18px] mt-0.5 text-brand flex-shrink-0" aria-label="Bonne réponse" />
                          : <XCircle className="w-[18px] h-[18px] mt-0.5 text-[#a23b34] flex-shrink-0" aria-label="Mauvaise réponse" />}
                        <div className="min-w-0 text-[13.5px] text-ink-soft">
                          <p className="font-semibold text-ink"><span className="fd-nums">{i + 1}.</span> <MathText text={q.question} /></p>
                          {!c.is_correct && c.your_answer !== null && q.options[c.your_answer] !== undefined && (
                            <p className="mt-1">Ta réponse : <MathText text={q.options[c.your_answer]} className="line-through decoration-[#a23b34]/60" /></p>
                          )}
                          <p className="mt-1">Bonne réponse : <b className="text-ink"><MathText text={q.options[c.correct_answer] ?? ''} /></b></p>
                          {c.explanation && <p className="mt-1.5 text-ink-faint"><MathText text={c.explanation} /></p>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="px-6 py-4 border-t border-line flex flex-wrap gap-2.5 justify-end">
            <button className="fd-btn-ghost" onClick={() => startQuiz(activeQuiz.chapterId, activeQuiz.chapterName, activeQuiz.subjectName)}>
              <RotateCcw className="w-4 h-4" /> Refaire (nouvelles questions)
            </button>
            <button className="fd-btn-primary" onClick={closeQuiz}>Autres chapitres</button>
          </div>
        </section>
      </div>
    );
  }

  /* ─────────────── Chargement / quiz vide ─────────────── */
  if (activeQuiz && (quizLoading || !quizState)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-ink-faint">
        <Loader2 className="w-7 h-7 animate-spin mb-3" />
        <p className="text-sm">Préparation du quiz…</p>
      </div>
    );
  }
  if (activeQuiz && quizState && quizState.questions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <Hourglass className="w-8 h-8 text-gold mx-auto mb-3" />
        <h3 className="text-[16px] font-bold text-ink">Quiz en préparation</h3>
        <p className="text-[13.5px] text-ink-faint mt-1.5 mb-5">Les questions de « {activeQuiz.chapterName} » ne sont pas encore prêtes.</p>
        <button className="fd-btn-primary mx-auto" onClick={closeQuiz}>Retour aux chapitres</button>
      </div>
    );
  }

  /* ─────────────── Quiz en cours ─────────────── */
  if (activeQuiz && quizState) {
    const q = quizState.questions[quizState.currentIndex];
    const answer = quizState.answers[q.id];
    const total = quizState.questions.length;
    const answered = Object.keys(quizState.answers).length;
    const isLast = quizState.currentIndex === total - 1;
    const go = (i: number) => setQuizState({ ...quizState, currentIndex: i });
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={closeQuiz} label="Quitter" />
          <span className="text-[13px] font-medium text-ink-faint truncate">
            {activeQuiz.subjectName ? `${activeQuiz.subjectName} · ` : ''}{activeQuiz.chapterName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-[#f2f1ee] overflow-hidden" role="progressbar"
            aria-valuenow={quizState.currentIndex + 1} aria-valuemin={1} aria-valuemax={total} aria-label="Question en cours">
            <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${((quizState.currentIndex + 1) / total) * 100}%` }} />
          </div>
          <span className="text-[13px] font-bold text-ink fd-nums">{quizState.currentIndex + 1} / {total}</span>
        </div>

        <section className="rounded-2xl border border-line bg-white p-6">
          <span className="inline-block text-[11.5px] font-semibold text-ink-faint bg-[#f7f6f3] px-2.5 py-1 rounded-full">
            {DIFFICULTY[q.difficulty] ?? 'Facile'}
          </span>
          <h3 className="mt-3 mb-5 text-[17px] font-semibold text-ink leading-relaxed"><MathText text={q.question} /></h3>
          <div role="radiogroup" aria-label="Réponses" className="flex flex-col gap-2.5">
            {q.options.map((opt, i) => {
              const selected = answer === i;
              return (
                <button key={i} type="button" role="radio" aria-checked={selected}
                  onClick={() => setQuizState({ ...quizState, answers: { ...quizState.answers, [q.id]: i } })}
                  className={`w-full text-left flex items-center gap-3 min-h-[48px] px-4 py-3 rounded-xl border-[1.5px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    selected ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-[#cfcdc8]'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${
                    selected ? 'bg-brand text-white' : 'border-2 border-[#cfcdc8] text-ink-faint'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <MathText text={opt} className={`text-[14.5px] ${selected ? 'text-brand-hover font-semibold' : 'text-ink-soft'}`} />
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => go(quizState.currentIndex - 1)} disabled={quizState.currentIndex === 0}
            className="px-3.5 py-2 rounded-lg text-[13.5px] font-medium text-ink-faint hover:text-ink disabled:opacity-40">
            Précédent
          </button>
          <div className="flex gap-1.5" aria-label={`${answered} réponse${answered > 1 ? 's' : ''} sur ${total}`}>
            {quizState.questions.map((qq, i) => (
              <button key={qq.id} type="button" onClick={() => go(i)} aria-label={`Question ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === quizState.currentIndex ? 'w-6 bg-brand'
                  : quizState.answers[qq.id] !== undefined ? 'w-2 bg-[#9fcdb1]' : 'w-2 bg-line'}`} />
            ))}
          </div>
          {isLast ? (
            <button className="fd-btn-primary" onClick={submitQuiz} disabled={answered < total || submitting}
              style={{ opacity: answered < total || submitting ? 0.5 : 1 }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : 'Terminer'}
            </button>
          ) : (
            <button className="fd-btn-primary" onClick={() => go(quizState.currentIndex + 1)} disabled={answer === undefined}
              style={{ opacity: answer === undefined ? 0.5 : 1 }}>
              Suivant
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────── Vue principale ─────────────── */
  return (
    <div className="flex flex-col gap-6">
      <header data-tour="skilliq-hero" className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.1em] text-gold-strong">
            <Brain className="w-3.5 h-3.5" /> Skill IQ
          </p>
          <h1 className="fd-display text-ink mt-2" style={{ fontSize: 'clamp(26px,3vw,34px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Mesure ta maîtrise, chapitre par chapitre
          </h1>
          <p className="text-[14px] text-ink-faint mt-2 leading-relaxed">
            Jusqu’à 10 questions tirées au hasard, corrigées tout de suite avec les explications.
            Ton score s’affiche aussi sur ton tableau de bord.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 lg:w-[420px]">
          <Stat label="Quiz passés" value={assessments.length} />
          <Stat label="Score moyen" value={average !== null ? `${average} %` : '—'} />
          <Stat label={subjects.length > 1 && subject ? `Quiz · ${subject.name}` : 'Quiz disponibles'} value={`${availableHere} / ${chapters.length}`} />
        </dl>
      </header>

      {classLevels.length > 1 && (
        <div role="tablist" aria-label="Niveau" className="flex flex-wrap gap-2">
          {classLevels.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={l.id === levelId} onClick={() => { setLevelId(l.id); setSubjectId(null); }}
              className={`min-h-[40px] px-4 rounded-full text-[13px] font-semibold border transition-colors ${
                l.id === levelId ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-line hover:border-ink'}`}>
              {l.name}
            </button>
          ))}
        </div>
      )}

      {subjects.length > 1 && (
        <div role="tablist" aria-label="Matière" className="flex flex-wrap gap-1 p-1 rounded-xl bg-[#f2f1ee] self-start">
          {subjects.map((s) => {
            const on = s.id === subject?.id;
            const ready = readyIn(s);
            return (
              <button key={s.id} type="button" role="tab" aria-selected={on} onClick={() => setSubjectId(s.id)}
                className={`min-h-[38px] px-3.5 rounded-lg text-[13px] font-semibold transition-colors ${
                  on ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
                {s.name}
                <span className="ml-1.5 text-[11.5px] font-medium text-ink-faint fd-nums">{ready ? `${ready} quiz` : 'bientôt'}</span>
              </button>
            );
          })}
        </div>
      )}

      {subject && (
        <div className="flex items-baseline justify-between gap-3 -mb-2">
          <h2 className="text-[15px] font-semibold text-ink">{subject.name}</h2>
          <span className="text-[12.5px] text-ink-faint fd-nums">
            {chapters.length} chapitre{chapters.length > 1 ? 's' : ''} · {availableHere} quiz prêt{availableHere > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {chapters.length > 0 && availableHere === 0 && (
        <div className="rounded-2xl border border-gold-line bg-gold-soft px-5 py-4 flex items-start gap-3">
          <Hourglass className="w-5 h-5 text-gold-strong flex-shrink-0 mt-0.5" />
          <p className="text-[13.5px] text-ink-soft leading-relaxed">
            <b className="text-ink">Les quiz {subject ? `de ${subject.name.toLowerCase()} ` : ''}de ce niveau sont en préparation.</b> Chaque chapitre ci-dessous s’activera
            dès que ses questions seront prêtes. En attendant, entraîne-toi sur les{' '}
            <Link to={`/exercises?${new URLSearchParams({ ...(levelId ? { classLevels: String(levelId) } : {}), ...(subject ? { subjects: String(subject.id) } : {}) })}`} className="font-semibold text-brand-hover underline">exercices</Link>.
          </p>
        </div>
      )}

      <div data-tour="skilliq-niveaux" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {chapters.map((c) => {
          const a = byChapter.get(c.id);
          const n = available[c.id] ?? 0;
          const score = a ? pct(a) : null;
          const lv = a ? LEVEL[a.level] ?? LEVEL.beginner : null;
          return (
            <article key={c.id} className={`rounded-2xl border bg-white p-4 flex flex-col gap-3 ${n ? 'border-line' : 'border-dashed border-line opacity-75'}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14.5px] font-semibold text-ink leading-snug">{c.name}</h3>
                {a && lv && <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${lv.className}`}>{lv.label}</span>}
              </div>

              {a && score !== null ? (
                <div>
                  <div className="flex items-baseline justify-between text-[12px] text-ink-faint">
                    <span><b className="text-[18px] text-ink fd-nums">{score} %</b> au dernier quiz</span>
                    <span>{frDate(a.completed_at)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[#f2f1ee] overflow-hidden">
                    <div className={`h-full rounded-full ${score >= 50 ? 'bg-brand' : 'bg-gold'}`} style={{ width: `${Math.max(score, 3)}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-faint inline-flex items-center gap-1.5">
                  {n ? <><Clock className="w-3.5 h-3.5" /> {Math.min(n, 10)} questions · environ {Math.max(2, Math.round(Math.min(n, 10) * 0.75))} min</>
                    : <><Hourglass className="w-3.5 h-3.5" /> En préparation</>}
                </p>
              )}

              <div className="mt-auto">
                {n ? (
                  <button type="button" onClick={() => startQuiz(c.id, c.name, subject?.name)}
                    className={`${a ? 'fd-btn-ghost' : 'fd-btn-primary'} w-full justify-center`} style={{ minHeight: 40 }}>
                    {a ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />} {a ? 'Refaire le quiz' : 'Passer le quiz'}
                  </button>
                ) : (
                  <span className="block text-center text-[12.5px] font-medium text-ink-faint py-2 rounded-lg bg-[#faf9f7]">Bientôt disponible</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {classLevels.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-line bg-white">
          <Brain className="w-8 h-8 text-[#cfcdc8] mx-auto mb-3" />
          <p className="text-[14px] text-ink-faint">Aucun niveau disponible pour l’instant.</p>
        </div>
      )}
    </div>
  );
};

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[18px] font-bold text-ink fd-nums">{value}</dd>
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-ink-faint hover:text-ink self-start min-h-[36px]">
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}

export default SkillIQSection;
