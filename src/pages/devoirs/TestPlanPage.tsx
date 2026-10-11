/**
 * Plan de révision d'un DS (« Mon prochain DS », 08/10/2026 ; refonte du 11/10/2026) : /revisions/ds/:id
 *
 * On y arrive depuis Réviser (« Continuer ma préparation ») : même en-tête, même carte héros.
 * En haut, ta préparation : « Prêt à … % » (maîtrise des chapitres, comme Ma progression), UNE prochaine
 * étape conseillée, et les étapes (exercices, quiz s'il y en a, DS blanc). Puis :
 *   1. tes chapitres, du plus fragile au plus solide (notions à renforcer, contenus à revoir) ;
 *   2. des exercices choisis pour toi dans ces chapitres ;
 *   3. le DS blanc chronométré.
 * Backend : apps/interactions/devoirs.py.
 * 10/10/2026 : « S'entraîner » ouvre la page du chapitre au niveau de l'élève (les plus faciles d'abord, sans les
 * réussis) ; le quiz d'un chapitre ramène ici (« Retour à mon DS »).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Brain, CalendarCheck, CalendarX, Check, ChevronDown, ClipboardCheck, Clock, Dumbbell, Loader2,
  Pencil, RefreshCw, RotateCcw, Timer, WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, Section, EmptyState, CardsSkeleton } from '@/components/space/Page';
import {
  devoirsApi, longDate, plural, testTitle, type PlanChapter, type PlanExercise, type TestPlan, type UpcomingTest,
} from '@/lib/api/devoirsApi';
import { STATUS } from '@/pages/progression/status';
import { Meter } from '@/pages/progression/ui';
import { TestFormModal } from '@/components/devoirs/TestFormModal';
import { GradeForm } from '@/components/devoirs/GradeForm';
import { Countdown, DateTile, DifficultyDot, GradeBadge, ReadinessRing } from '@/components/devoirs/ui';
import { lessonsUrl, practiceUrl, quizUrl } from '@/pages/progression/links';

const BACK = { to: '/reviser', label: 'Réviser' };
const EXERCISES_SHOWN = 3;

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** Le chapitre ouvert d'office : le plus fragile, s'il reste du travail. */
const firstOpen = (p: TestPlan) => {
  const c = p.chapters[0];
  return c && c.status !== 'mastered' && c.status !== 'good' ? c.id : null;
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
    return { text: `Commence par le quiz «\u00a0${quizChapter.name}\u00a0» : en quelques minutes, tu sauras où tu en es.`,
      to: quizUrl(quizChapter.id, `/revisions/ds/${t.id}`), label: 'Passer le quiz' };
  }
  const mockReady = !!p.mock?.exercises.length && !prep.mock;
  if (t.days_left <= 1 && mockReady) {
    return { text: `Ton DS est ${t.days_left === 0 ? 'aujourd’hui' : 'demain'} : fais le DS blanc, en conditions réelles.`, to: blanc, label: 'Lancer le DS blanc' };
  }
  const weakest = p.chapters[0];
  if (weakest && (weakest.status === 'weak' || weakest.status === 'todo') && prep.exercises < prep.exercises_goal) {
    return { text: weakest.status === 'todo'
      ? `Commence par «\u00a0${weakest.name}\u00a0» : tu ne l’as pas encore travaillé.`
      : `Commence par «\u00a0${weakest.name}\u00a0» : c’est ton chapitre le plus fragile.`,
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
  return { text: 'Belle préparation ! La veille, refais un exercice «\u00a0à revoir\u00a0», puis repose-toi.' };
}

export default function TestPlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingGrade, setEditingGrade] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [moreExercises, setMoreExercises] = useState(false);
  // Un seul chapitre ouvert à la fois (undefined : pas encore choisi, on ouvre le plus fragile).
  const [openChapter, setOpenChapter] = useState<number | null | undefined>(undefined);
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
      .then((p) => { setPlan(p); setError(null); setOpenChapter((cur) => (cur === undefined || (cur !== null && !p.chapters.some((c) => c.id === cur)) ? firstOpen(p) : cur)); })
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
          <div className="h-48 animate-pulse rounded-3xl border border-line bg-white" />
          <CardsSkeleton n={3} />
        </div>
      </Page>
    );
  }

  const t = plan.test;
  const past = t.days_left < 0;
  const a = advice(plan);
  const weakCount = plan.chapters.filter((c) => c.status === 'weak').length;
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
  // « Voir ce chapitre » : on l'ouvre, puis on y descend.
  const goToAnchor = (anchor: string) => (e: React.MouseEvent) => {
    const m = /^chapitre-(\d+)$/.exec(anchor);
    if (m) setOpenChapter(Number(m[1]));
    scrollTo(anchor)(e);
  };

  const mock = plan.mock;
  const prep = plan.preparation;
  const shownExercises = moreExercises ? plan.exercises : plan.exercises.slice(0, EXERCISES_SHOWN);

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
        {/* Héros (comme sur Réviser) : la date et la prochaine étape, où j'en suis ; puis les étapes de la préparation */}
        <section aria-labelledby="etape-titre" className="overflow-hidden rounded-3xl border border-line bg-white">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            <div className="flex items-start gap-4 sm:flex-1">
              <DateTile date={t.date} size="lg" urgent={!past && t.days_left <= 1} />
              <div className="min-w-0">
                <h2 id="etape-titre" className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">
                  {past ? 'Après le DS' : 'Prochaine étape'}
                </h2>
                <p className="mt-1.5 text-[16.5px] font-semibold leading-snug text-ink sm:text-[17px]">
                  {past ? 'Comment s’est passé ton DS\u00a0?' : a.text}
                </p>
                {past && <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">Note ta note pour suivre tes résultats au fil de l’année.</p>}
                {/* Les chapitres et leur état sont juste dessous (« Tes chapitres ») : pas de pastilles en double ici. */}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:w-[260px] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div className="flex items-center gap-3">
                <ReadinessRing value={plan.readiness} size={64} />
                <p className="text-[13px] leading-snug text-ink-faint">
                  {plan.readiness === null ? <>Pas encore de mesure : quelques exercices corrigés suffisent.</>
                    : <>
                      <span className="block text-ink-soft">Prêt à <b className="fd-nums font-semibold text-ink">{plan.readiness} %</b></span>
                      {weakCount > 0
                        ? `${plural(weakCount, 'chapitre', 'chapitres')} à renforcer`
                        : 'Tu es sur la bonne voie.'}
                    </>}
                </p>
              </div>
              {past ? (
                t.grade !== null && !editingGrade ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] text-ink-faint">Ma note</span>
                    <GradeBadge grade={t.grade} />
                    <button type="button" onClick={() => setEditingGrade(true)} className="inline-flex min-h-10 items-center px-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
                      Changer
                    </button>
                  </div>
                ) : (
                  <GradeForm test={t} autoFocus={editingGrade} onSaved={(n) => { setTest(n); setEditingGrade(false); }} />
                )
              ) : a.label && (a.to ? (
                <Link to={a.to} className="fd-btn-primary min-h-11 w-full justify-center">{a.label} <ArrowRight className="h-4 w-4" /></Link>
              ) : (
                <a href={`#${a.anchor}`} onClick={goToAnchor(a.anchor!)} className="fd-btn-primary min-h-11 w-full justify-center">
                  {a.label} <ArrowRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line bg-[#fcfbf9] px-5 py-3 sm:px-6">
            <span className="text-[12px] font-semibold text-ink-faint">Ta préparation</span>
            <ul className="flex flex-wrap gap-2" aria-label="Ta préparation depuis l’ajout de ce DS">
              <Step done={prep.exercises >= prep.exercises_goal} icon={Dumbbell}
                label={`Exercices ${Math.min(prep.exercises, prep.exercises_goal)}/${prep.exercises_goal}`} anchor="exercices" />
              {prep.quizzes_total > 0 && (
                <Step done={prep.quizzes >= prep.quizzes_total} icon={Brain} label={`Quiz ${prep.quizzes}/${prep.quizzes_total}`} anchor="chapitres" />
              )}
              <Step done={prep.mock} icon={Timer} label={prep.mock ? 'DS blanc fait' : 'DS blanc'} anchor="ds-blanc" />
            </ul>
          </div>
        </section>

        {/* Chapitres : une ligne chacun, un seul ouvert à la fois */}
        <Section id="chapitres" title="Tes chapitres" count={plan.chapters.length}
          hint="Du plus fragile au plus solide. Ouvre un chapitre pour savoir quoi travailler.">
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {plan.chapters.map((c) => (
              <ChapterRow key={c.id} chapter={c} testId={t.id} open={openChapter === c.id} quizDone={prep.quiz_done.includes(c.id)}
                onToggle={() => setOpenChapter((cur) => (cur === c.id ? null : c.id))} />
            ))}
          </ul>
        </Section>

        {/* Exercices pour toi : trois d'abord */}
        <Section id="exercices" title="Exercices pour toi" count={plan.exercises.length}
          hint={plan.exercises.length ? 'Choisis dans les chapitres du DS, les plus utiles d’abord.' : undefined}>
          {plan.exercises.length ? (
            <>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shownExercises.map((e) => <ExerciseCard key={e.id} exercise={e} />)}
              </ul>
              {plan.exercises.length > EXERCISES_SHOWN && (
                <button type="button" onClick={() => setMoreExercises((v) => !v)} aria-expanded={moreExercises}
                  className="mt-3 inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
                  {moreExercises ? 'Voir moins' : `Voir ${plural(plan.exercises.length - EXERCISES_SHOWN, 'autre exercice', 'autres exercices')}`}
                  <ChevronDown className={`h-4 w-4 transition-transform ${moreExercises ? 'rotate-180' : ''}`} />
                </button>
              )}
            </>
          ) : (
            <EmptyState compact icon={Check} title="Tout est réussi dans ces chapitres"
              text={mock?.exercises.length
                ? 'Refais ceux que tu as marqués «\u00a0à revoir\u00a0», ou lance le DS blanc pour te tester en conditions réelles.'
                : 'Refais ceux que tu as marqués «\u00a0à revoir\u00a0» : c’est le meilleur moyen de garder la main.'} />
          )}
        </Section>

        {/* DS blanc */}
        <Section id="ds-blanc" title="DS blanc" hint={mock?.exercises.length ? 'Un sujet chronométré tiré des chapitres du DS, puis ta correction.' : undefined}>
          {mock?.exercises.length ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                  mock.done_at ? 'bg-brand-soft text-brand-hover ring-brand-line' : 'bg-[#f2f1ee] text-ink-soft ring-line'}`} aria-hidden>
                  {mock.done_at ? <ClipboardCheck className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">
                    {plural(mock.exercises.length, 'exercice', 'exercices')} · <span className="fd-nums">{mock.minutes} min</span>
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">
                    {mock.done_at
                      ? `Fait le ${new Date(mock.done_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}${mock.seconds !== null ? ` en ${minutesLabel(mock.seconds)}` : ''}.`
                      : mock.started_at ? 'Commencé : le chronomètre tourne toujours.'
                        : 'Chronomètre, pas de solution avant la fin, puis tu te corriges question par question.'}
                  </p>
                  {!mock.done_at && mock.exercises.some((e) => e.chapter) && (
                    <p className="mt-2 truncate text-[12px] text-ink-faint">
                      {mock.exercises.map((e) => e.chapter).filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              {mock.done_at ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/revisions/ds/${t.id}/blanc`} className="fd-btn-ghost min-h-10"><ClipboardCheck className="h-4 w-4" /> Ma correction</Link>
                  <button type="button" onClick={renew} disabled={renewing} className="fd-btn-ghost min-h-10 disabled:opacity-60">
                    {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Un autre DS blanc
                  </button>
                </div>
              ) : (
                <Link to={`/revisions/ds/${t.id}/blanc`} className="fd-btn-primary min-h-11 justify-center">
                  {mock.started_at ? 'Reprendre' : 'Lancer le DS blanc'} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ) : (
            <EmptyState compact icon={Timer} tone="ink" title="Pas encore de DS blanc"
              text="Il n’y a pas encore assez d’exercices dans ces chapitres pour en composer un." />
          )}
        </Section>
      </div>

      <TestFormModal open={editing} test={t} onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); }}
        onDeleted={() => navigate('/reviser')} />
    </Page>
  );
}

function Step({ done, icon: Icon, label, anchor }: { done: boolean; icon: typeof Dumbbell; label: string; anchor: string }) {
  return (
    <li>
      <a href={`#${anchor}`} onClick={scrollTo(anchor)}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors sm:min-h-9 ${
          done ? 'bg-brand-soft text-brand-hover' : 'border border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink'}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />} {label}
        {done && <span className="sr-only"> (fait)</span>}
      </a>
    </li>
  );
}

function ChapterRow({ chapter: c, testId, open, onToggle, quizDone }: {
  chapter: PlanChapter; testId: number; open: boolean; onToggle: () => void; quizDone: boolean;
}) {
  const st = STATUS[c.status];
  const Icon = st.icon;
  const panelId = `chapitre-${c.id}-detail`;
  const hasDetail = c.notions.worst.length > 0 || c.review.length > 0;
  const link = 'inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors';
  return (
    <li id={`chapitre-${c.id}`} className="scroll-mt-24">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId}
        className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fcfbf9] focus:outline-none focus-visible:bg-[#fcfbf9] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:px-5">
        <Icon className={`h-[18px] w-[18px] shrink-0 ${st.text}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{c.name}</span>
          <span className="block text-[12px] text-ink-faint">
            <span className={c.status === 'weak' ? st.text : ''}>{st.label}</span>
            {c.review.length > 0 && <> · {plural(c.review.length, 'exercice', 'exercices')} à revoir</>}
          </span>
        </span>
        {c.mastery !== null && <Meter pct={c.mastery} status={c.status} className="hidden w-24 sm:block" />}
        <span className="fd-nums w-11 shrink-0 text-right text-[13px] font-semibold text-ink-soft">{c.mastery !== null ? `${c.mastery} %` : '—'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 sm:pl-[50px] sm:pr-5">
          <div className={`text-[13px] leading-relaxed text-ink-soft ${hasDetail ? 'space-y-2.5 rounded-xl bg-[#fcfbf9] px-4 py-3 ring-1 ring-inset ring-[#efece6]' : ''}`}>
            {c.notions.worst.length > 0 && (
              <p><span className="font-semibold text-gold-strong">À renforcer :</span> {c.notions.worst.map((n) => `${n.label} (${n.pct} %)`).join(', ')}</p>
            )}
            {c.review.length > 0 && (
              <div>
                <p className="font-semibold text-ink">À revoir</p>
                <ul className="mt-0.5">
                  {c.review.map((r) => (
                    <li key={r.id}>
                      <Link to={r.url} className="inline-flex min-h-9 items-center gap-1.5 text-ink-soft underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink-faint">
                        <RotateCcw className="h-3.5 w-3.5 shrink-0 text-gold-strong" aria-hidden /> {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.status === 'todo' && (
              <p className="text-ink-faint">Pas encore travaillé : commence par un exercice facile{c.quiz_ready ? ' ou par le quiz' : ''}.</p>
            )}
            {c.status === 'started' && <p className="text-ink-faint">Encore quelques questions corrigées et tu auras ton pourcentage.</p>}
            {(c.status === 'mastered' || c.status === 'good') && !hasDetail && (
              <p className="text-ink-faint">Rien d’urgent ici : un exercice de temps en temps suffit à garder la main.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Link to={practiceUrl(c.hub_url, c.id)} className={`${link} bg-brand-soft text-brand-hover hover:bg-[#dcece2]`}>
              <Dumbbell className="h-4 w-4" /> S’entraîner
            </Link>
            <Link to={lessonsUrl(c.hub_url, c.id)} className={`${link} text-ink-soft hover:bg-[#f2f1ee] hover:text-ink`}>
              <BookOpen className="h-4 w-4" /> Le cours
            </Link>
            {c.quiz_ready && (
              <Link to={quizUrl(c.id, `/revisions/ds/${testId}`)} className={`${link} text-ink-soft hover:bg-[#f2f1ee] hover:text-ink`}>
                {quizDone ? <Check className="h-4 w-4 text-brand" /> : <Brain className="h-4 w-4" />}
                {quizDone ? 'Quiz fait' : c.skilliq?.pct != null ? `Refaire le quiz (${c.skilliq.pct} %)` : 'Le quiz'}
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
