/**
 * Préparation d'un DS (« Mon prochain DS ») : /revisions/ds/:id
 *
 * Refonte du 11/10/2026 (« trop d'infos, même moi j'ai du mal ») : deux blocs seulement.
 *   1. Le DS blanc, en vedette : un grand bouton, deux réglages discrets (durée, difficulté), la composition du
 *      sujet en une ligne ; une fois fait, ton temps, « Ma correction » et « Un autre DS blanc ».
 *      DS passé : à la place, ta note.
 *   2. « Réviser avant » : une ligne par chapitre (maîtrise, S'entraîner, le cours, le quiz), du plus fragile au
 *      plus solide ; les exercices conseillés, repliés.
 * Backend : apps/interactions/devoirs.py (plan, ds-blanc).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Brain, CalendarCheck, CalendarX, Check, ChevronDown, ClipboardCheck, Clock, Dumbbell, Loader2,
  Pencil, RefreshCw, RotateCcw, SlidersHorizontal, Timer, WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, Section, EmptyState, CardsSkeleton } from '@/components/space/Page';
import {
  devoirsApi, longDate, plural, testTitle, type MockDifficulty, type PlanChapter, type PlanExercise, type TestPlan, type UpcomingTest,
} from '@/lib/api/devoirsApi';
import { STATUS } from '@/pages/progression/status';
import { Meter } from '@/pages/progression/ui';
import { ETAT } from '@/pages/progression/etat';
import { TestFormModal } from '@/components/devoirs/TestFormModal';
import { GradeForm } from '@/components/devoirs/GradeForm';
import { Countdown, DifficultyDot, GradeBadge } from '@/components/devoirs/ui';
import { lessonsUrl, practiceUrl, quizUrl } from '@/pages/progression/links';

const BACK = { to: '/reviser', label: 'Réviser' };

const minutesLabel = (s: number) => {
  const m = Math.max(1, Math.round(s / 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
};
const durationLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`);
const MOCK_DIFFICULTIES: { key: MockDifficulty; label: string }[] = [
  { key: '', label: 'Mélangée' }, { key: 'easy', label: 'Facile' }, { key: 'medium', label: 'Moyenne' }, { key: 'hard', label: 'Difficile' },
];

export default function TestPlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingGrade, setEditingGrade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const { setCrumbs } = useBreadcrumb();
  const crumbTitle = plan ? testTitle(plan.test) : null;
  useEffect(() => {
    // Même mot que le menu (« Mon suivi › Réviser »), qui reste surligné.
    setCrumbs([{ label: 'Réviser', to: '/reviser' }, { label: crumbTitle ?? 'Préparation du DS' }]);
  }, [crumbTitle, setCrumbs]);
  useEffect(() => () => setCrumbs(null), [setCrumbs]);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
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
      <Page>
        <PageHeader back={BACK} eyebrow="Préparation du DS" title={error === 'missing' ? 'DS introuvable' : 'Préparation du DS'} />
        {error === 'missing' ? (
          <EmptyState icon={CalendarX} tone="ink" title="Ce DS n’existe plus"
            text="Il a peut-être été supprimé. Retrouve tes DS et tes révisions sur la page Réviser."
            action={<Link to="/reviser" className="fd-btn-primary min-h-10">Aller à Réviser <ArrowRight className="h-4 w-4" /></Link>} />
        ) : (
          <EmptyState icon={WifiOff} tone="gold" title="Le plan n’a pas pu être chargé"
            text="Vérifie ta connexion, puis réessaie."
            action={<button type="button" className="fd-btn-primary min-h-10" onClick={load}><RotateCcw className="h-4 w-4" /> Réessayer</button>}
            secondary={<Link to="/reviser" className="fd-btn-ghost min-h-10">Réviser</Link>} />
        )}
      </Page>
    );
  }
  if (!plan) {
    return (
      <Page>
        <PageHeader back={BACK} eyebrow="Préparation du DS"
          title={<><span className="sr-only">Chargement de la préparation…</span><span aria-hidden className="inline-block h-[0.9em] w-72 max-w-full animate-pulse rounded-lg bg-[#efece6] align-middle" /></>} />
        <div className="flex flex-col gap-10" aria-busy>
          <div className="h-56 animate-pulse rounded-3xl border border-line bg-white" />
          <CardsSkeleton n={3} />
        </div>
      </Page>
    );
  }

  const t = plan.test;
  const past = t.days_left < 0;
  const mock = plan.mock;
  const setTest = (next: UpcomingTest) => setPlan((p) => (p ? { ...p, test: { ...p.test, ...next } } : p));
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); load(); } finally { setBusy(false); }
  };
  const blancUrl = `/revisions/ds/${t.id}/blanc`;
  const chapterNames = [...new Set((mock?.exercises ?? []).map((e) => e.chapter).filter(Boolean))] as string[];

  return (
    <Page>
      <SEO title={`${testTitle(t)} — préparation`} description="Ta révision ciblée pour ce DS." canonicalUrl={`/revisions/ds/${t.id}`} />
      <PageHeader
        back={BACK}
        eyebrow={past ? 'DS passé' : 'Préparation du DS'}
        icon={CalendarCheck}
        title={testTitle(t)}
        subtitle={<span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1"><Countdown days={t.days_left} /> {longDate(t.date)}</span>}
        actions={(
          <button type="button" onClick={() => setEditing(true)} className="fd-btn-ghost min-h-10" aria-label="Modifier ce DS">
            <Pencil className="h-4 w-4" /> Modifier
          </button>
        )}
      />

      <div className="flex flex-col gap-10">
        {/* ───────────── 1. Le DS blanc, en vedette (DS passé : la note) */}
        {past ? (
          <section aria-labelledby="note-titre" className="rounded-3xl border border-line bg-white p-5 sm:p-7">
            <h2 id="note-titre" className="fd-display text-[22px] leading-tight text-ink">Comment s’est passé ton DS ?</h2>
            <p className="mt-1 text-[13.5px] text-ink-faint">Note ta note pour suivre tes résultats au fil de l’année.</p>
            <div className="mt-4">
              {t.grade !== null && !editingGrade ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-ink-faint">Ma note</span>
                  <GradeBadge grade={t.grade} />
                  <button type="button" onClick={() => setEditingGrade(true)} className="inline-flex min-h-10 items-center px-1 text-[13px] font-semibold text-brand-hover hover:underline">Changer</button>
                </div>
              ) : (
                <GradeForm test={t} autoFocus={editingGrade} onSaved={(n) => { setTest(n); setEditingGrade(false); }} />
              )}
            </div>
          </section>
        ) : (
          <section aria-labelledby="blanc-titre" className="overflow-hidden rounded-3xl bg-[#14583a] text-white shadow-[0_18px_40px_-18px_rgba(20,88,58,.6)]">
            <div className="p-6 sm:p-8">
              <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[.12em] text-white/70">
                <Timer className="h-4 w-4" aria-hidden /> DS blanc
              </p>
              <h2 id="blanc-titre" className="fd-display mt-2 text-[26px] leading-tight sm:text-[30px]">
                {mock?.done_at ? 'DS blanc terminé' : mock?.started_at ? 'Ton DS blanc t’attend' : 'Entraîne-toi en conditions réelles'}
              </h2>
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-white/80">
                {mock?.done_at
                  ? `Fait le ${new Date(mock.done_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}${mock.seconds !== null ? ` en ${minutesLabel(mock.seconds)}` : ''}. Corrige-toi question par question, puis tente un autre sujet.`
                  : mock?.started_at ? 'Le chronomètre tourne toujours : reprends là où tu en étais.'
                    : 'Un vrai sujet sur les chapitres de ton DS, chronométré, sans solution avant la fin. Puis tu te corriges.'}
              </p>

              {mock?.exercises.length ? (
                <>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {mock.done_at ? (
                      <>
                        <Link to={blancUrl} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 text-[15px] font-semibold text-[#14583a] hover:bg-[#eef6f1]">
                          <ClipboardCheck className="h-5 w-5" /> Ma correction
                        </Link>
                        <button type="button" onClick={() => run(() => devoirsApi.mockAction(t.id, 'new'))} disabled={busy}
                          className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/30 px-5 text-[14.5px] font-semibold text-white hover:bg-white/10 disabled:opacity-60">
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Un autre DS blanc
                        </button>
                      </>
                    ) : (
                      <Link to={blancUrl} className="inline-flex min-h-14 items-center gap-2.5 rounded-2xl bg-white px-7 text-[16px] font-semibold text-[#14583a] shadow-sm hover:bg-[#eef6f1]">
                        {mock.started_at ? 'Reprendre' : 'Lancer le DS blanc'}
                        <span className="fd-nums rounded-lg bg-[#14583a]/10 px-2 py-0.5 text-[13px]">{durationLabel(mock.minutes)}</span>
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    )}
                  </div>
                  <p className="mt-4 text-[13px] text-white/70">
                    {plural(mock.exercises.length, 'exercice', 'exercices')} de 3 questions au moins
                    {chapterNames.length > 0 && <> · {chapterNames.join(' · ')}</>}
                  </p>
                  {mock.settings && mock.minutes < mock.settings.minutes - 10 && (
                    <p className="mt-1 text-[12.5px] text-[#f3dca9]">
                      Sujet plus court que {durationLabel(mock.settings.minutes)} : il n’y a pas encore assez d’exercices longs dans ces chapitres.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-[13.5px] text-white/90">
                  {mock?.settings?.difficulty
                    ? 'Pas d’exercice long (3 questions au moins) de cette difficulté dans ces chapitres : essaie « Mélangée ».'
                    : 'Pas encore assez d’exercices longs (3 questions au moins) dans ces chapitres pour composer un sujet.'}
                </p>
              )}
            </div>

            {/* Réglages : discrets, repliés ; un changement tire un nouveau sujet. */}
            {mock?.settings && (
              <div className="border-t border-white/15 bg-black/10 px-6 py-3 sm:px-8">
                <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}
                  className="inline-flex min-h-10 items-center gap-2 text-[13.5px] font-medium text-white/85 hover:text-white">
                  <SlidersHorizontal className="h-4 w-4" />
                  Durée : <b className="font-semibold text-white">{durationLabel(mock.settings.minutes)}</b> · Difficulté :{' '}
                  <b className="font-semibold text-white">{MOCK_DIFFICULTIES.find((d) => d.key === mock.settings!.difficulty)?.label}</b>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                </button>
                {showSettings && (
                  <MockSettings settings={mock.settings} busy={busy} started={!!mock.started_at && !mock.done_at}
                    onChange={(minutes, difficulty) => run(() => devoirsApi.mockSettings(t.id, minutes, difficulty))} />
                )}
                {mock.difficulty_respected === false && (
                  <p className="pb-1 text-[12.5px] text-[#f3dca9]">Pas assez d’exercices longs de cette difficulté : d’autres complètent le sujet.</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ───────────── 2. Réviser avant : une ligne par chapitre, ses boutons directs */}
        <Section id="chapitres" title={past ? 'Tes chapitres' : 'Réviser avant'}
          hint={plan.readiness !== null
            ? `Prêt à ${plan.readiness} % d’après tes exercices corrigés. Le plus fragile d’abord.`
            : 'Du plus fragile au plus solide. Quelques exercices corrigés suffisent pour mesurer où tu en es.'}>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {plan.chapters.map((c) => (
              <ChapterRow key={c.id} chapter={c} testId={t.id} quizDone={plan.preparation.quiz_done.includes(c.id)} />
            ))}
          </ul>

          {plan.exercises.length > 0 && (
            <div className="mt-4">
              <button type="button" onClick={() => setShowExercises((v) => !v)} aria-expanded={showExercises}
                className="inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold text-ink-soft hover:text-ink">
                <Dumbbell className="h-4 w-4" /> Exercices conseillés pour ce DS ({plan.exercises.length})
                <ChevronDown className={`h-4 w-4 transition-transform ${showExercises ? 'rotate-180' : ''}`} />
              </button>
              {showExercises && (
                <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {plan.exercises.map((e) => <ExerciseCard key={e.id} exercise={e} />)}
                </ul>
              )}
            </div>
          )}
        </Section>
      </div>

      <TestFormModal open={editing} test={t} onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); }}
        onDeleted={() => navigate('/reviser')} />
    </Page>
  );
}

/** Réglages du DS blanc (sur fond vert) : durée et difficulté ; un changement tire un nouveau sujet. */
function MockSettings({ settings, busy, started, onChange }: {
  settings: NonNullable<NonNullable<TestPlan['mock']>['settings']>; busy: boolean; started: boolean;
  onChange: (minutes: number, difficulty: MockDifficulty) => void;
}) {
  const pick = (minutes: number, difficulty: MockDifficulty) => {
    if (minutes === settings.minutes && difficulty === settings.difficulty) return;
    if (started && !window.confirm('Ton DS blanc est commencé : le changer en tire un nouveau. Continuer ?')) return;
    onChange(minutes, difficulty);
  };
  const seg = (on: boolean) => `min-h-9 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:opacity-60 ${
    on ? 'bg-white text-[#14583a] shadow-sm' : 'text-white/80 hover:text-white'}`;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pb-2 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-white/80">Durée</span>
        <div className="inline-flex flex-wrap rounded-xl bg-white/10 p-1" role="group" aria-label="Durée du DS blanc">
          {settings.choices.map((m) => (
            <button key={m} type="button" aria-pressed={settings.minutes === m} disabled={busy} onClick={() => pick(m, settings.difficulty)}
              className={seg(settings.minutes === m)}>{durationLabel(m)}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-white/80">Difficulté</span>
        <div className="inline-flex flex-wrap rounded-xl bg-white/10 p-1" role="group" aria-label="Difficulté du DS blanc">
          {MOCK_DIFFICULTIES.map((d) => (
            <button key={d.key || 'mix'} type="button" aria-pressed={settings.difficulty === d.key} disabled={busy}
              onClick={() => pick(settings.minutes, d.key)} className={seg(settings.difficulty === d.key)}>{d.label}</button>
          ))}
        </div>
      </div>
      {busy && <Loader2 className="h-4 w-4 animate-spin text-white/80" aria-label="Nouveau sujet…" />}
    </div>
  );
}

/** Un chapitre : où j'en suis, et les trois façons de le travailler (rien à déplier). */
function ChapterRow({ chapter: c, testId, quizDone }: { chapter: PlanChapter; testId: number; quizDone: boolean }) {
  const st = STATUS[c.status];
  const Icon = st.icon;
  const link = 'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold transition-colors';
  return (
    <li id={`chapitre-${c.id}`} className="scroll-mt-24 px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Icon className={`h-[18px] w-[18px] shrink-0 ${st.text}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-ink">{c.name}</p>
          <p className="text-[12px] text-ink-faint">
            {/* État de Ma progression (13/10/2026) ; « pas encore évalué » : l'ancien état, plus parlant ici. */}
            <span className={c.status === 'weak' ? st.text : ''}>{c.etat && c.etat !== 'non_evalue' ? ETAT[c.etat].label : st.label}</span>
            {c.mastery !== null && <> · <span className="fd-nums">{c.mastery} %</span></>}
            {c.review.length > 0 && <> · {plural(c.review.length, 'exercice', 'exercices')} à revoir</>}
          </p>
        </div>
        {c.mastery !== null && <Meter pct={c.mastery} status={c.status} className="hidden w-24 md:block" />}
        <div className="flex flex-wrap items-center gap-1">
          <Link to={practiceUrl(c.hub_url, c.id)} className={`${link} bg-brand-soft text-brand-hover hover:bg-[#dcece2]`}>
            <Dumbbell className="h-4 w-4" /> S’entraîner
          </Link>
          <Link to={lessonsUrl(c.hub_url, c.id)} className={`${link} text-ink-soft hover:bg-[#f2f1ee] hover:text-ink`}>
            <BookOpen className="h-4 w-4" /> Cours
          </Link>
          {c.quiz_ready && (
            <Link to={quizUrl(c.id, `/revisions/ds/${testId}`)} className={`${link} text-ink-soft hover:bg-[#f2f1ee] hover:text-ink`}>
              {quizDone ? <Check className="h-4 w-4 text-brand" /> : <Brain className="h-4 w-4" />} Quiz
            </Link>
          )}
        </div>
      </div>
      {c.review.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-x-4 pl-[30px]">
          {c.review.slice(0, 3).map((r) => (
            <li key={r.id}>
              <Link to={r.url} className="inline-flex min-h-8 items-center gap-1.5 text-[12.5px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink">
                <RotateCcw className="h-3.5 w-3.5 shrink-0 text-gold-strong" aria-hidden /> {r.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ExerciseCard({ exercise: e }: { exercise: PlanExercise }) {
  const reason = e.reason?.startsWith('Suite de ton travail') ? 'Suite de ton travail' : e.reason;
  const tone = reason === 'À retravailler' ? 'bg-gold-soft text-gold-strong'
    : reason === 'Suite de ton travail' ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-soft';
  return (
    <li>
      <Link to={`/exercises/${e.id}`}
        className="group flex h-full flex-col rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <span className="flex items-start justify-between gap-2">
          {e.chapter && <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{e.chapter}</span>}
          {reason && <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{reason}</span>}
        </span>
        <span className="mt-1.5 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink group-hover:underline">{e.title}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12px] text-ink-faint">
          <DifficultyDot level={e.difficulty} />
          <span className="fd-nums inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{e.minutes} min</span>
          {e.status === 'seen' && <span>Déjà ouvert</span>}
        </span>
      </Link>
    </li>
  );
}
