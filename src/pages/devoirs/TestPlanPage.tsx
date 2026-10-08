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
  ArrowLeft, ArrowRight, Brain, Check, CheckCircle2, Clock, Dumbbell, Loader2, Pencil, RefreshCw, RotateCcw, Timer,
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
    return { text: `Encore ${plural(left, 'exercice', 'exercices')} dans les chapitres du DS, et tu seras prêt pour le DS blanc.`, anchor: 'exercices', label: 'Voir les exercices' };
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <SEO title={`${testTitle(t)} — préparation`} description="Ta révision ciblée pour ce DS." canonicalUrl={`/revisions/ds/${t.id}`} />
      <Link to="/revision-lists" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-faint hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Révisions
      </Link>

      {/* En-tête : date, titre, chapitres */}
      <header className="mt-4 flex gap-4 sm:gap-5">
        <DateTile date={t.date} size="lg" urgent={t.days_left >= 0 && t.days_left <= 1} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Countdown days={t.days_left} />
            <span className="text-[13px] text-ink-faint">{longDate(t.date)}</span>
          </div>
          <h1 className="fd-display mt-1 text-[26px] leading-tight text-ink md:text-[30px]">{testTitle(t)}</h1>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {t.chapters.map((c) => (
              <span key={c.id} className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-[12.5px] text-ink-soft ring-1 ring-line">{c.name}</span>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="fd-btn-ghost h-9 shrink-0 self-start px-3" aria-label="Modifier ce DS">
          <Pencil className="h-4 w-4" /><span className="hidden sm:inline">Modifier</span>
        </button>
      </header>

      {past && (
        <Card className="mt-6 border-gold-line bg-gold-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-ink">Comment s’est passé ton DS ?</h2>
              <p className="mt-0.5 text-[13px] text-ink-soft">Ta note reste dans tes révisions : tu suis tes résultats au fil de l’année.</p>
            </div>
            {t.grade !== null ? <GradeBadge grade={t.grade} /> : <GradeForm test={t} onSaved={setTest} />}
          </div>
        </Card>
      )}

      {/* Ta préparation */}
      <Card className="mt-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center">
            <ReadinessRing value={plan.readiness} />
            <span className="mt-1 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{plan.readiness === null ? 'à mesurer' : 'prêt'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold uppercase tracking-[.07em] text-ink-faint">Prochaine étape</p>
            <p className="mt-1 text-[17px] font-semibold leading-snug text-ink">{a.text}</p>
            {a.label && (a.to
              ? <Link to={a.to} className="fd-btn-primary mt-3">{a.label} <ArrowRight className="h-4 w-4" /></Link>
              : <a href={`#${a.anchor}`} onClick={scrollTo(a.anchor!)} className="fd-btn-primary mt-3">{a.label} <ArrowRight className="h-4 w-4" /></a>)}
          </div>
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-3">
          <Step done={plan.preparation.exercises >= plan.preparation.exercises_goal} icon={Dumbbell} label="Exercices"
            value={`${Math.min(plan.preparation.exercises, plan.preparation.exercises_goal)} / ${plan.preparation.exercises_goal}`} anchor="exercices" />
          {plan.preparation.quizzes_total > 0 ? (
            <Step done={plan.preparation.quizzes >= plan.preparation.quizzes_total} icon={Brain} label="Quiz Skill IQ"
              value={`${plan.preparation.quizzes} / ${plan.preparation.quizzes_total}`} anchor="chapitres" />
          ) : (
            <Step done={false} icon={Brain} label="Quiz Skill IQ" value="pas de quiz pour ces chapitres" muted />
          )}
          <Step done={plan.preparation.mock} icon={Timer} label="DS blanc" value={plan.preparation.mock ? 'fait' : 'à faire'} anchor="ds-blanc" />
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
          Depuis l’ajout de ce DS. « Prêt à » suit ta maîtrise des chapitres, comme dans <Link to="/progression" className="font-semibold text-brand-hover hover:underline">Ma progression</Link>.
        </p>
      </Card>

      {/* 1. Chapitres */}
      <Card id="chapitres" className="mt-6">
        <SectionTitle n={1} title="Tes chapitres, du plus fragile au plus solide"
          hint="Commence par le haut : ce que tu maîtrises le moins passe en premier." />
        <ol className="mt-4 flex flex-col gap-3">
          {plan.chapters.map((c, i) => (
            <ChapterRow key={c.id} chapter={c} rank={i + 1} quizDone={plan.preparation.quiz_done.includes(c.id)} />
          ))}
        </ol>
      </Card>

      {/* 2. Exercices */}
      <Card id="exercices" className="mt-6">
        <SectionTitle n={2} title="Exercices choisis pour toi"
          hint="Dans les chapitres du DS, d’abord ce qui est à retravailler ; jamais ce que tu as déjà réussi." />
        {plan.exercises.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.exercises.map((e) => <ExerciseCard key={e.id} exercise={e} />)}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line bg-paper px-4 py-5 text-[13px] text-ink-faint">
            Tu as réussi tous les exercices de ces chapitres. Refais ceux « à revoir » ou lance le DS blanc.
          </p>
        )}
      </Card>

      {/* 3. DS blanc */}
      <Card id="ds-blanc" className="mt-6">
        <SectionTitle n={3} title="DS blanc"
          hint={plan.mock?.exercises.length
            ? `${plural(plan.mock.exercises.length, 'exercice', 'exercices')} · ${plan.mock.minutes} min, en conditions réelles : chronomètre et pas de solution avant la fin. Ensuite, tu te corriges question par question.`
            : undefined} />
        {plan.mock?.exercises.length ? (
          <>
            <ol className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {plan.mock.exercises.map((e, i) => (
                <li key={e.id} className="flex items-center gap-3 bg-white px-4 py-3">
                  <span className="fd-nums inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[12.5px] font-bold text-ink-soft">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{e.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-faint">
                      {e.chapter && <span className="truncate">{e.chapter}</span>}
                      <DifficultyDot level={e.difficulty} />
                    </p>
                  </div>
                  <span className="fd-nums inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-ink-soft"><Clock className="h-3.5 w-3.5" />{e.minutes} min</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {plan.mock.done_at ? (
                <>
                  <p className="mr-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-hover">
                    <CheckCircle2 className="h-4 w-4" />
                    Fait le {new Date(plan.mock.done_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {plan.mock.seconds !== null && ` en ${minutesLabel(plan.mock.seconds)}`}
                  </p>
                  <Link to={`/revisions/ds/${t.id}/blanc`} className="fd-btn-ghost"><RotateCcw className="h-4 w-4" /> Revoir ma correction</Link>
                  <button type="button" onClick={renew} disabled={renewing} className="fd-btn-ghost">
                    {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Un autre DS blanc
                  </button>
                </>
              ) : (
                <Link to={`/revisions/ds/${t.id}/blanc`} className="fd-btn-primary">
                  <Timer className="h-4 w-4" /> {plan.mock.started_at ? 'Reprendre le DS blanc' : 'Lancer le DS blanc'}
                </Link>
              )}
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line bg-paper px-4 py-5 text-[13px] text-ink-faint">
            Pas encore assez d’exercices dans ces chapitres pour un DS blanc.
          </p>
        )}
      </Card>

      <TestFormModal open={editing} test={t} onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); }}
        onDeleted={() => navigate('/revision-lists')} />
    </div>
  );
}

function SectionTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex gap-3">
      <span className="fd-nums mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">{n}</span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-bold tracking-tight text-ink">{title}</h2>
        {hint && <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-ink-faint">{hint}</p>}
      </div>
    </div>
  );
}

function Step({ done, icon: Icon, label, value, anchor, muted }: {
  done: boolean; icon: typeof Dumbbell; label: string; value: string; anchor?: string; muted?: boolean;
}) {
  const body = (
    <>
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        done ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft'}`}>
        {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
        <span className="fd-nums block truncate text-[12.5px] text-ink-faint">{value}</span>
      </span>
    </>
  );
  const cls = `flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
    done ? 'border-brand/25 bg-brand-soft' : muted ? 'border-line bg-paper opacity-70' : 'border-line bg-paper hover:border-[#cfcdc8]'}`;
  return (
    <li>
      {anchor && !muted ? <a href={`#${anchor}`} onClick={scrollTo(anchor)} className={cls}>{body}</a> : <div className={cls}>{body}</div>}
    </li>
  );
}

function ChapterRow({ chapter: c, rank, quizDone }: { chapter: PlanChapter; rank: number; quizDone: boolean }) {
  const st = STATUS[c.status];
  const Icon = st.icon;
  const pill = 'inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-hover';
  return (
    <li id={`chapitre-${c.id}`} className={`scroll-mt-24 rounded-xl border p-4 ${c.status === 'weak' ? 'border-gold-line bg-gold-soft/35' : 'border-line bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className="fd-nums mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[11.5px] font-bold text-ink-soft">{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">{c.name}</h3>
            <span className={`inline-flex items-center gap-1 text-[12.5px] font-semibold ${st.text}`}>
              <Icon className="h-3.5 w-3.5" />{st.label}{c.mastery !== null && <span className="fd-nums font-medium opacity-80">· {c.mastery} %</span>}
            </span>
          </div>
          {c.mastery !== null && <Meter pct={c.mastery} status={c.status} className="mt-2" />}
          <div className="mt-2 space-y-1 text-[13px] leading-relaxed text-ink-soft">
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
            <Link to={`/exercises?chapters=${c.id}`} className={pill}><Dumbbell className="h-3.5 w-3.5" /> Exercices du chapitre</Link>
            {c.quiz_ready && (
              <Link to={`/skill-iq?chapitre=${c.id}`} className={pill}>
                <Brain className="h-3.5 w-3.5" />
                {quizDone ? 'Quiz fait ✓' : c.skilliq?.pct != null ? `Refaire le quiz (${c.skilliq.pct} %)` : 'Quiz Skill IQ'}
              </Link>
            )}
          </div>
        </div>
      </div>
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
