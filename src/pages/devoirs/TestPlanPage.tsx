/**
 * Plan de révision d'un DS (« Mon prochain DS », 08/10/2026) : /revisions/ds/:id
 *
 * En haut, ta préparation : « Prêt à … % » (maîtrise des chapitres, comme Ma progression), UNE prochaine
 * étape conseillée, et les trois choses à faire (exercices, quiz, DS blanc). Puis :
 *   1. tes chapitres, du plus fragile au plus solide (notions à renforcer, contenus à revoir, quiz) ;
 *   2. des exercices choisis pour toi dans ces chapitres ;
 *   3. le DS blanc chronométré.
 * Backend : apps/interactions/devoirs.py.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Brain, Check, ChevronDown, Clock, Dumbbell, Loader2, Pencil, RefreshCw, RotateCcw, Timer,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { SEO } from '@/components/layout/SEO';
import {
  devoirsApi, longDate, plural, testTitle, type PlanChapter, type PlanExercise, type TestPlan, type UpcomingTest,
} from '@/lib/api/devoirsApi';
import { STATUS } from '@/pages/progression/status';
import { Meter } from '@/pages/progression/ui';
import { TestFormModal } from '@/components/devoirs/TestFormModal';
import { GradeForm } from '@/components/devoirs/GradeForm';
import { Card, Countdown, DateTile, DifficultyDot, GradeBadge, ReadinessRing } from '@/components/devoirs/ui';

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const minutesLabel = (s: number) => {
  const m = Math.max(1, Math.round(s / 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
};

/** La prochaine étape, une seule : la plus utile maintenant. */
function advice(p: TestPlan): { text: string; to?: string; anchor?: string; label?: string } {
  const t = p.test;
  const prep = p.preparation;
  const blanc = `/revisions/ds/${t.id}/blanc`;
  if (t.days_left < 0) return { text: 'Ton DS est passé : note ta note pour suivre tes résultats au fil de l’année.' };
  const noData = p.chapters.every((c) => c.mastery === null);
  const quizChapter = p.chapters.find((c) => c.quiz_ready && !prep.quiz_done.includes(c.id));
  if (noData && quizChapter) {
    return { text: `Commence par le quiz « ${quizChapter.name} » : en quelques minutes, tu sauras où tu en es.`,
      to: `/skill-iq?chapitre=${quizChapter.id}`, label: 'Passer le quiz' };
  }
  const mockReady = !!p.mock?.exercises.length && !prep.mock;
  if (t.days_left <= 1 && mockReady) {
    return { text: `Ton DS est ${t.days_left === 0 ? 'aujourd’hui' : 'demain'} : fais le DS blanc, en conditions réelles.`, to: blanc, label: 'Lancer le DS blanc' };
  }
  const weakest = p.chapters[0];
  if (weakest && (weakest.status === 'weak' || weakest.status === 'todo') && prep.exercises < prep.exercises_goal) {
    return { text: weakest.status === 'todo'
      ? `Commence par « ${weakest.name} » : tu ne l’as pas encore travaillé.`
      : `Commence par « ${weakest.name} » : c’est ton chapitre le plus fragile.`,
    anchor: `chapitre-${weakest.id}`, label: 'Voir ce chapitre' };
  }
  if (prep.exercises < prep.exercises_goal) {
    const left = prep.exercises_goal - prep.exercises;
    return { text: prep.mock
      ? `Encore ${plural(left, 'exercice', 'exercices')} dans les chapitres du DS pour consolider.`
      : `Encore ${plural(left, 'exercice', 'exercices')} dans les chapitres du DS, et tu seras prêt pour le DS blanc.`,
    anchor: 'exercices', label: 'Voir les exercices' };
  }
  if (mockReady) return { text: 'Tu as bien travaillé : place au DS blanc, en conditions réelles.', to: blanc, label: 'Lancer le DS blanc' };
  return { text: 'Belle préparation ! La veille, refais un exercice « à revoir », puis repose-toi.' };
}

export default function TestPlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);
  const [editing, setEditing] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [moreExercises, setMoreExercises] = useState(false);
  const { setCrumbs } = useBreadcrumb();
  const crumbTitle = plan ? testTitle(plan.test) : null;
  useEffect(() => {
    setCrumbs([{ label: 'Révisions', to: '/revision-lists' }, { label: crumbTitle ?? 'Préparation du DS' }]);
  }, [crumbTitle, setCrumbs]);
  useEffect(() => () => setCrumbs(null), [setCrumbs]);

  const load = useCallback(() => {
    if (!id) return;
    devoirsApi.plan(Number(id))
      .then((p) => { setPlan(p); setError(null); })
      .catch((e) => setError(e?.response?.status === 404 ? 'missing' : 'failed'));
  }, [id]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { navigate('/login'); return; }
    if (isAuthenticated) load();
  }, [authLoading, isAuthenticated, load, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-[15px] text-ink-soft">{error === 'missing' ? 'Ce DS n’existe plus.' : 'Le plan n’a pas pu être chargé.'}</p>
        <div className="mt-4 flex justify-center gap-2">
          {error === 'failed' && <button type="button" className="fd-btn-ghost" onClick={load}>Réessayer</button>}
          <Link to="/revision-lists" className="fd-btn-primary">Mes révisions</Link>
        </div>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6" aria-busy>
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="mt-5 h-48 animate-pulse rounded-2xl bg-white" />
        <div className="mt-5 h-72 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  const t = plan.test;
  const past = t.days_left < 0;
  const a = advice(plan);
  const setTest = (next: UpcomingTest) => setPlan((p) => (p ? { ...p, test: { ...p.test, ...next } } : p));
  const renew = async () => {
    setRenewing(true);
    try {
      await devoirsApi.mockAction(t.id, 'new');
      load();
    } finally {
      setRenewing(false);
    }
  };

  const mock = plan.mock;
  const prep = plan.preparation;
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <SEO title={`${testTitle(t)} — préparation`} description="Ta révision ciblée pour ce DS." canonicalUrl={`/revisions/ds/${t.id}`} />
      <Link to="/revision-lists" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-faint hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Révisions
      </Link>

      {/* En-tête : date, titre, chapitres */}
      <header className="mt-4 flex gap-4">
        <DateTile date={t.date} size="md" urgent={t.days_left >= 0 && t.days_left <= 1} />
        <div className="min-w-0 flex-1">
          <h1 className="fd-display text-[26px] leading-tight text-ink md:text-[28px]">{testTitle(t)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-faint">
            <Countdown days={t.days_left} /> {longDate(t.date)}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-soft">{t.chapters.map((c) => c.name).join(' · ')}</p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink" aria-label="Modifier ce DS" title="Modifier">
          <Pencil className="h-4 w-4" />
        </button>
      </header>

      {past && (
        <Card className="mt-6 border-gold-line bg-gold-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-ink">Comment s’est passé ton DS ?</p>
            {t.grade !== null ? <GradeBadge grade={t.grade} /> : <GradeForm test={t} onSaved={setTest} />}
          </div>
        </Card>
      )}

      {/* La prochaine étape, et les trois choses à faire */}
      <Card className="mt-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex shrink-0 flex-col items-center">
            <ReadinessRing value={plan.readiness} size={78} />
            <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-ink-faint">{plan.readiness === null ? 'à mesurer' : 'prêt'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-bold uppercase tracking-[.07em] text-ink-faint">Prochaine étape</p>
            <p className="mt-1 text-[16px] font-semibold leading-snug text-ink">{a.text}</p>
            {a.label && (a.to
              ? <Link to={a.to} className="fd-btn-primary mt-3">{a.label} <ArrowRight className="h-4 w-4" /></Link>
              : <a href={`#${a.anchor}`} onClick={scrollTo(a.anchor!)} className="fd-btn-primary mt-3">{a.label} <ArrowRight className="h-4 w-4" /></a>)}
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4" aria-label="Ta préparation depuis l’ajout de ce DS">
          <Step done={prep.exercises >= prep.exercises_goal} icon={Dumbbell}
            label={`Exercices ${Math.min(prep.exercises, prep.exercises_goal)}/${prep.exercises_goal}`} anchor="exercices" />
          {prep.quizzes_total > 0 && (
            <Step done={prep.quizzes >= prep.quizzes_total} icon={Brain} label={`Quiz ${prep.quizzes}/${prep.quizzes_total}`} anchor="chapitres" />
          )}
          <Step done={prep.mock} icon={Timer} label={prep.mock ? 'DS blanc fait' : 'DS blanc'} anchor="ds-blanc" />
        </ul>
      </Card>

      {/* Chapitres : le plus fragile ouvert, les autres en une ligne */}
      <section id="chapitres" className="mt-7 scroll-mt-20">
        <h2 className="fd-display mb-3 text-[20px] leading-tight text-ink">Tes chapitres</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {plan.chapters.map((c, i) => (
            <ChapterRow key={c.id} chapter={c} defaultOpen={i === 0 && c.status !== 'mastered'} quizDone={prep.quiz_done.includes(c.id)} />
          ))}
        </ul>
      </section>

      {/* Exercices pour toi : trois d'abord */}
      <section id="exercices" className="mt-7 scroll-mt-20">
        <h2 className="fd-display mb-3 text-[20px] leading-tight text-ink">Exercices pour toi</h2>
        {plan.exercises.length ? (
          <>
            <ul className="grid gap-3 sm:grid-cols-3">
              {(moreExercises ? plan.exercises : plan.exercises.slice(0, 3)).map((e) => <ExerciseCard key={e.id} exercise={e} />)}
            </ul>
            {plan.exercises.length > 3 && (
              <button type="button" onClick={() => setMoreExercises((v) => !v)} className="mt-2 text-[13px] font-semibold text-brand-hover hover:underline">
                {moreExercises ? 'Voir moins' : `Voir ${plan.exercises.length - 3} de plus`}
              </button>
            )}
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-line bg-white px-4 py-5 text-[13px] text-ink-faint">
            Tu as réussi tous les exercices de ces chapitres : refais ceux « à revoir » ou lance le DS blanc.
          </p>
        )}
      </section>

      {/* DS blanc */}
      <section id="ds-blanc" className="mt-7 scroll-mt-20">
        <h2 className="fd-display mb-3 text-[20px] leading-tight text-ink">DS blanc</h2>
        <Card>
          {mock?.exercises.length ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft"><Timer className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">
                  {plural(mock.exercises.length, 'exercice', 'exercices')} · {mock.minutes} min
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">
                  {mock.done_at
                    ? `Fait le ${new Date(mock.done_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}${mock.seconds !== null ? ` en ${minutesLabel(mock.seconds)}` : ''}.`
                    : 'En conditions réelles : chronomètre et pas de solution avant la fin, puis ta correction.'}
                </p>
              </div>
              {mock.done_at ? (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/revisions/ds/${t.id}/blanc`} className="fd-btn-ghost"><RotateCcw className="h-4 w-4" /> Ma correction</Link>
                  <button type="button" onClick={renew} disabled={renewing} className="fd-btn-ghost">
                    {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Un autre
                  </button>
                </div>
              ) : (
                <Link to={`/revisions/ds/${t.id}/blanc`} className="fd-btn-primary">
                  {mock.started_at ? 'Reprendre' : 'Lancer le DS blanc'} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-ink-faint">Pas encore assez d’exercices dans ces chapitres pour un DS blanc.</p>
          )}
        </Card>
      </section>

      <TestFormModal open={editing} test={t} onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); }}
        onDeleted={() => navigate('/revision-lists')} />
    </div>
  );
}

function Step({ done, icon: Icon, label, anchor }: { done: boolean; icon: typeof Dumbbell; label: string; anchor: string }) {
  return (
    <li>
      <a href={`#${anchor}`} onClick={scrollTo(anchor)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
          done ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-soft hover:bg-[#ebe9e4]'}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />} {label}
      </a>
    </li>
  );
}

function ChapterRow({ chapter: c, defaultOpen, quizDone }: { chapter: PlanChapter; defaultOpen: boolean; quizDone: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const st = STATUS[c.status];
  const Icon = st.icon;
  const pill = 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-hover';
  return (
    <li id={`chapitre-${c.id}`} className="scroll-mt-24">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#faf9f7] sm:px-5">
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.status === 'todo' ? 'bg-[#f2f1ee]' : st.track}`}>
          <Icon className={`h-3.5 w-3.5 ${st.text}`} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-ink">{c.name}</span>
        <span className={`fd-nums shrink-0 text-[13px] font-bold ${st.text}`}>{c.mastery !== null ? `${c.mastery} %` : st.label.toLowerCase()}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pl-[60px] sm:px-5 sm:pl-[64px]">
          {c.mastery !== null && <Meter pct={c.mastery} status={c.status} className="mb-2.5 max-w-xs" />}
          <div className="space-y-1 text-[13px] leading-relaxed text-ink-soft">
            {c.notions.worst.length > 0 && (
              <p><span className="font-semibold text-[#8a6318]">À renforcer :</span> {c.notions.worst.map((n) => `${n.label} (${n.pct} %)`).join(', ')}</p>
            )}
            {c.review.length > 0 && (
              <p>
                <span className="font-semibold text-[#a23b34]">À revoir :</span>{' '}
                {c.review.map((r, i) => (
                  <React.Fragment key={r.id}>{i > 0 && ', '}<Link to={r.url} className="underline decoration-line underline-offset-2 hover:text-ink">{r.title}</Link></React.Fragment>
                ))}
              </p>
            )}
            {c.status === 'todo' && <p className="text-ink-faint">Pas encore travaillé : un exercice facile ou le quiz pour te lancer.</p>}
            {c.status === 'started' && <p className="text-ink-faint">Encore quelques questions évaluées et tu auras ton pourcentage.</p>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={`/exercises?chapters=${c.id}`} className={pill}><Dumbbell className="h-3.5 w-3.5" /> S’entraîner</Link>
            {c.quiz_ready && (
              <Link to={`/skill-iq?chapitre=${c.id}`} className={pill}>
                <Brain className="h-3.5 w-3.5" />{quizDone ? 'Quiz fait ✓' : c.skilliq?.pct != null ? `Refaire le quiz (${c.skilliq.pct} %)` : 'Quiz'}
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function ExerciseCard({ exercise: e }: { exercise: PlanExercise }) {
  const reason = e.reason?.startsWith('Suite de ton travail') ? 'Suite de ton travail' : e.reason;
  const tone = reason === 'À retravailler' ? 'bg-[#fbecea] text-[#a23b34]'
    : reason === 'Suite de ton travail' ? 'bg-brand-soft text-brand-hover' : 'bg-gold-soft text-[#8a6318]';
  return (
    <li>
      <Link to={`/exercises/${e.id}`} className="group flex h-full flex-col rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_rgba(20,18,16,.08)]">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-faint">{e.chapter}</span>
          {reason && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{reason}</span>}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink group-hover:underline">{e.title}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12px] text-ink-faint">
          <DifficultyDot level={e.difficulty} />
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{e.minutes} min</span>
          {e.status === 'seen' && <span>déjà ouvert</span>}
        </div>
      </Link>
    </li>
  );
}
