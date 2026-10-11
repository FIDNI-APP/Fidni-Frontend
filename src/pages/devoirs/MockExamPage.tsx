/**
 * DS blanc (« Mon prochain DS », 08/10/2026) : /revisions/ds/:id/blanc
 *
 * 1. Avant : les exercices tirés (un par chapitre, le plus fragile d'abord), la durée, les règles.
 * 2. Pendant : chronomètre collé en haut (le temps restant, puis le dépassement), énoncés sans
 *    solution ni auto-évaluation (ExerciseRenderer « locked »). L'horloge est celle du serveur :
 *    recharger la page ou revenir plus tard ne la remet pas à zéro.
 * 3. Après : le temps mis, puis la correction question par question (solutions + Réussi / À revoir),
 *    qui met à jour la préparation du DS et Ma progression.
 * Refonte du 11/10/2026 : mêmes briques que Réviser et le plan (components/space/Page) ; pendant l'épreuve,
 * la barre d'onglets du téléphone est cachée et le chronomètre montre aussi le temps écoulé en barre.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, CalendarX, CheckCircle2, ClipboardCheck, Clock, Flag, Loader2, RotateCcw, Timer, WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useHideMobileTabBar } from '@/components/layout/nav';
import { Page, PageHeader, EmptyState, CardsSkeleton, SplitBar } from '@/components/space/Page';
import { api } from '@/lib/api/apiClient';
import { devoirsApi, plural, testTitle, type MockExam, type UpcomingTest } from '@/lib/api/devoirsApi';
import { ExerciseRenderer, type AssessChanges } from '@/components/content/viewer/ExerciseRenderer';
import { assessQuestions, type AssessSource } from '@/lib/api/contentItemApi';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { assessablePaths } from '@/lib/utils/contentHelpers';
import type { AssessmentStatus } from '@/types/content';
import { DifficultyDot } from '@/components/devoirs/ui';

type Data = MockExam & { test: UpcomingTest };
type Progress = Record<string, { status: AssessmentStatus }>;

const clock = (s: number) => {
  const a = Math.abs(s);
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const sec = a % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const minutesLabel = (s: number) => {
  const m = Math.max(1, Math.round(s / 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
};

export default function MockExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  // Chargement impossible : DS absent (404) ou réseau ; une action ratée (commencer, terminer) reste sur la page.
  const [error, setError] = useState<'missing' | 'failed' | null>(null);
  const [actError, setActError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const { setCrumbs } = useBreadcrumb();
  const crumbTitle = data ? testTitle(data.test) : null;
  useEffect(() => {
    // Même mot que le menu (« Mon suivi › Réviser »), qui reste surligné.
    setCrumbs([{ label: 'Réviser', to: '/reviser' },
      { label: crumbTitle ?? 'Préparation du DS', to: `/revisions/ds/${id}` }, { label: 'DS blanc' }]);
  }, [crumbTitle, id, setCrumbs]);
  useEffect(() => () => setCrumbs(null), [setCrumbs]);

  const load = useCallback(() => {
    if (!id) return;
    devoirsApi.mock(Number(id)).then(setData)
      .catch((e) => setError(e?.response?.status === 404 ? 'missing' : 'failed'));
  }, [id]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) { navigate('/login'); return; }
    if (isAuthenticated) load();
  }, [authLoading, isAuthenticated, load, navigate]);

  const phase: 'intro' | 'running' | 'review' = !data?.started_at ? 'intro' : !data.done_at ? 'running' : 'review';
  const total = (data?.minutes ?? 0) * 60;
  const elapsed = data?.started_at ? Math.max(0, Math.floor((now - Date.parse(data.started_at)) / 1000)) : 0;
  const remaining = total - elapsed;

  // Pendant l'épreuve : l'horloge avance chaque seconde ; quitter la page demande confirmation ;
  // pas de barre d'onglets sur le téléphone (comme l'épreuve d'un examen).
  useHideMobileTabBar(phase === 'running');
  useEffect(() => {
    if (phase !== 'running') return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => { window.clearInterval(tick); window.removeEventListener('beforeunload', warn); };
  }, [phase]);

  // Correction : ce qu'il a déjà corrigé de CE DS blanc (les évaluations d'avant ne comptent pas :
  // on se corrige sur cette copie-ci ; « Revoir ma correction » retrouve ces réponses).
  const exerciseIds = useMemo(() => (data?.exercises ?? []).map((e) => e.id).join(','), [data]);
  const startedAt = data?.started_at ? Date.parse(data.started_at) : 0;
  useEffect(() => {
    if (phase !== 'review' || !exerciseIds) return;
    exerciseIds.split(',').forEach((eid) => {
      api.get(`/contents/${eid}/question_progress/`)
        .then((r) => {
          const p: Progress = {};
          Object.entries(r.data || {}).forEach(([path, v]) => {
            const { status, assessed_at: at } = (v || {}) as { status?: AssessmentStatus; assessed_at?: string };
            if (status && at && Date.parse(at) >= startedAt) p[path] = { status };
          });
          setProgress((cur) => ({ ...cur, [Number(eid)]: { ...p, ...cur[Number(eid)] } }));
        })
        .catch(() => {});
    });
  }, [phase, exerciseIds, startedAt]);

  const act = async (action: 'start' | 'finish') => {
    if (!data || busy) return;
    if (action === 'finish' && !window.confirm('Terminer le DS blanc ? Tu verras ensuite les solutions pour te corriger.')) return;
    setBusy(true);
    setActError(false);
    try {
      const next = await devoirsApi.mockAction(data.test.id, action, action === 'finish' ? elapsed : undefined);
      setData(next);
      setNow(Date.now());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setActError(true);
    } finally {
      setBusy(false);
    }
  };

  // Correction d'une question (même enregistrement que sur la page de l'exercice, avec son origine :
  // question, « Tout réussi », « Tu avais trouvé ? »).
  const assess = async (exerciseId: number, structure: FlexibleExerciseStructure, changes: AssessChanges, source?: AssessSource) => {
    const before = progressRef.current[exerciseId] ?? {};
    const next: Progress = { ...before };
    for (const [path, s] of Object.entries(changes)) {
      if (s) next[path] = { status: s }; else delete next[path];
    }
    setProgress((cur) => ({ ...cur, [exerciseId]: next }));
    const leaves = assessablePaths(structure);
    const complete = leaves.length > 0 && leaves.every((p) => next[p]);
    const completion = complete ? (leaves.every((p) => next[p].status === 'success') ? 'success' : 'review') : undefined;
    try {
      await assessQuestions(exerciseId, changes, { source, ...(completion ? { completion } : {}) });
    } catch {
      setProgress((cur) => ({ ...cur, [exerciseId]: before }));
    }
  };

  const planPath = `/revisions/ds/${id}`;
  // DS supprimé : on revient à Réviser plutôt qu'à sa préparation, introuvable elle aussi.
  const BACK = error === 'missing' ? { to: '/reviser', label: 'Réviser' } : { to: planPath, label: 'Préparation du DS' };

  if (error) {
    return (
      <Page width="narrow">
        <PageHeader back={BACK} eyebrow="DS blanc" icon={Timer} title={error === 'missing' ? 'DS introuvable' : 'DS blanc'} />
        {error === 'missing' ? (
          <EmptyState icon={CalendarX} tone="ink" title="Ce DS n’existe plus"
            text="Il a peut-être été supprimé. Retrouve tes DS et tes révisions sur la page Réviser."
            action={<Link to="/reviser" className="fd-btn-primary min-h-10">Aller à Réviser <ArrowRight className="h-4 w-4" /></Link>} />
        ) : (
          <EmptyState icon={WifiOff} tone="gold" title="Le DS blanc n’a pas pu être chargé"
            text="Vérifie ta connexion, puis réessaie. Si tu l’avais commencé, ton chronomètre n’est pas perdu."
            action={<button type="button" className="fd-btn-primary min-h-10" onClick={() => { setError(null); load(); }}><RotateCcw className="h-4 w-4" /> Réessayer</button>}
            secondary={<Link to={planPath} className="fd-btn-ghost min-h-10">Ma préparation</Link>} />
        )}
      </Page>
    );
  }
  if (!data) {
    return (
      <Page width="narrow">
        <PageHeader back={BACK} eyebrow="DS blanc" icon={Timer}
          title={<><span className="sr-only">Chargement du DS blanc…</span><span aria-hidden className="inline-block h-[0.9em] w-60 max-w-full animate-pulse rounded-lg bg-[#efece6] align-middle" /></>} />
        <div className="flex flex-col gap-4" aria-busy>
          <div className="h-56 animate-pulse rounded-3xl border border-line bg-white" />
          <CardsSkeleton n={2} />
        </div>
      </Page>
    );
  }

  const title = testTitle(data.test);
  const corrected = data.exercises.reduce((n, e) => n + assessablePaths(e.structure).filter((p) => progress[e.id]?.[p]).length, 0);
  const succeeded = data.exercises.reduce((n, e) => n + assessablePaths(e.structure).filter((p) => progress[e.id]?.[p]?.status === 'success').length, 0);
  const toCorrect = data.exercises.reduce((n, e) => n + assessablePaths(e.structure).length, 0);
  const over = remaining < 0;
  const timerTone = over ? 'bg-[#fbecea] text-[#a23b34]' : remaining < 600 ? 'bg-gold-soft text-gold-strong' : 'bg-[#f2f1ee] text-ink';
  const barTone = over ? 'bg-[#a23b34]' : remaining < 600 ? 'bg-gold' : 'bg-brand';

  const actAlert = actError && (
    <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
      <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Ça n’a pas marché : vérifie ta connexion et réessaie.</p>
      <button type="button" onClick={() => setActError(false)} className="fd-btn-ghost min-h-9">OK</button>
    </div>
  );

  /* ───────────── 1. Avant : le sujet, la durée, les règles ───────────── */
  if (phase === 'intro') {
    return (
      <Page width="narrow">
        <PageHeader back={BACK} eyebrow={`DS blanc · ${title}`} icon={Timer}
          title={<>{plural(data.exercises.length, 'exercice', 'exercices')} · <span className="fd-nums">{data.minutes} min</span></>}
          subtitle="Un sujet tiré des chapitres de ton DS, le plus fragile d’abord. Comme en classe : pas de solution avant la fin." />
        {actAlert}
        <section aria-labelledby="sujet-titre" className="overflow-hidden rounded-3xl border border-line bg-white">
          <div className="px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
            <h2 id="sujet-titre" className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">Au programme</h2>
            {data.exercises.length ? (
              <ol className="mt-2 divide-y divide-line">
                {data.exercises.map((e, i) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <span className="fd-nums inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[13px] font-bold text-ink-soft">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{e.chapter ?? e.title}</p>
                      <p className="mt-0.5"><DifficultyDot level={e.difficulty} /></p>
                    </div>
                    <span className="fd-nums inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-ink-soft">
                      <Clock className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{e.minutes} min
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-4 text-[13.5px] text-ink-faint">Pas encore assez d’exercices dans les chapitres de ce DS pour composer un sujet.</p>
            )}
          </div>
          <ul className="grid gap-px border-t border-line bg-line sm:grid-cols-3" aria-label="Comment ça se passe">
            {([
              [Clock, `${data.minutes} minutes au calme`, 'Le chronomètre tourne même si tu quittes la page.'],
              [Flag, 'Comme en classe', 'Brouillon, calculatrice si elle est permise.'],
              [CheckCircle2, 'Puis tu te corriges', 'Question par question : ta préparation se met à jour.'],
            ] as const).map(([Icon, head, text]) => (
              <li key={head} className="flex gap-3 bg-[#fcfbf9] px-5 py-3.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                <p className="text-[12.5px] leading-snug text-ink-faint"><b className="font-semibold text-ink-soft">{head}</b> — {text}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-[13px] text-ink-faint">Prêt ? Le chronomètre démarre dès que tu commences.</p>
            <button type="button" onClick={() => act('start')} disabled={busy || !data.exercises.length}
              className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />} Commencer le DS blanc
            </button>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page width="narrow">
      {phase === 'running' ? (
        /* ───────────── 2. Pendant : énoncés seuls, chronomètre collé en haut ───────────── */
        <>
          <PageHeader eyebrow="DS blanc en cours" icon={Timer} title={title}
            subtitle="Pas de solution avant la fin. Quand tu as fini, clique sur «&nbsp;Terminer&nbsp;» pour te corriger." />
          <div className="sticky top-[68px] z-20 mb-5 overflow-hidden rounded-2xl border border-line bg-white/95 shadow-[0_6px_16px_rgba(20,18,16,.06)] backdrop-blur">
            <div className="flex items-center gap-3 py-2 pl-2 pr-2 sm:pl-2.5">
              <span className={`fd-nums inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[18px] font-bold ${timerTone}`}
                style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }} role="timer" aria-live="off" aria-label={over ? 'Temps dépassé' : 'Temps restant'}>
                <Timer className="h-4 w-4" aria-hidden />{over ? `+${clock(remaining)}` : clock(remaining)}
              </span>
              <span className="min-w-0 text-[12.5px] leading-tight text-ink-faint">
                {over ? <b className="font-semibold text-[#a23b34]">Temps dépassé</b> : 'restantes'}
                <span className="hidden sm:inline"> · prévu : {data.minutes} min</span>
              </span>
              <button type="button" onClick={() => act('finish')} disabled={busy} className="fd-btn-primary ml-auto min-h-10">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Terminer
              </button>
            </div>
            <div className="h-1 bg-[#f2f1ee]" aria-hidden>
              <div className={`h-full transition-[width] duration-1000 ease-linear ${barTone}`} style={{ width: `${total ? Math.min(100, (elapsed / total) * 100) : 0}%` }} />
            </div>
          </div>
          {actAlert}
          {over && (
            <p role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3 text-[13.5px] text-[#a23b34]">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Le temps prévu est écoulé. Termine quand tu es prêt : ton temps réel sera noté.
            </p>
          )}
        </>
      ) : (
        /* ───────────── 3. Après : le temps mis, puis la correction ───────────── */
        <>
          <PageHeader back={BACK} eyebrow={`DS blanc · ${title}`} icon={ClipboardCheck}
            title={data.seconds !== null ? `Terminé en ${minutesLabel(data.seconds)}` : 'DS blanc terminé'}
            subtitle={data.seconds !== null && data.seconds > total
              ? `${minutesLabel(data.seconds - total)} de plus que prévu (${data.minutes} min) : entraîne-toi à aller plus vite.`
              : `Prévu : ${data.minutes} min${data.seconds !== null ? ' : dans les temps.' : '.'}`} />
          {actAlert}
          <section aria-labelledby="correction-titre" className="mb-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="correction-titre" className="text-[15px] font-semibold text-ink">Ta correction</h2>
              <span className="fd-nums text-[13px] font-semibold text-ink-soft">{corrected} / {toCorrect} question{toCorrect > 1 ? 's' : ''}</span>
            </div>
            <SplitBar className="mt-2.5 h-2" success={succeeded} review={corrected - succeeded} total={toCorrect} />
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-faint">
              {corrected < toCorrect
                ? <>Ouvre la solution de chaque question (l’œil), puis dis <b className="font-semibold text-ink-soft">Réussi</b> ou <b className="font-semibold text-ink-soft">À revoir</b> : ta préparation et Ma progression se mettent à jour.</>
                : <><b className="fd-nums font-semibold text-brand-hover">{succeeded}</b> réussie{succeeded > 1 ? 's' : ''}
                  {corrected - succeeded > 0 && <> · <b className="fd-nums font-semibold text-gold-strong">{corrected - succeeded}</b> à revoir : refais-les dans 2 ou 3 jours</>}.
                  {' '}Correction terminée !</>}
            </p>
          </section>
        </>
      )}

      <div className="flex flex-col gap-5">
        {data.exercises.map((e, i) => {
          const leaves = phase === 'review' ? assessablePaths(e.structure) : [];
          const done = leaves.filter((p) => progress[e.id]?.[p]).length;
          return (
            <section key={e.id} aria-labelledby={`exercice-${e.id}`} className="rounded-2xl border border-line bg-white">
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-5 py-3.5 sm:px-6">
                <h2 id={`exercice-${e.id}`} className="fd-display text-[19px] text-ink">Exercice {i + 1}</h2>
                {e.chapter && <span className="text-[12.5px] text-ink-faint">{e.chapter}</span>}
                <span className="ml-auto inline-flex items-center gap-2">
                  {phase === 'review' && leaves.length > 0 && (
                    <span className={`fd-nums rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${done === leaves.length ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-faint'}`}>
                      {done === leaves.length ? 'Corrigé' : `${done}/${leaves.length} corrigée${leaves.length > 1 ? 's' : ''}`}
                    </span>
                  )}
                  <span className="fd-nums inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft"><Clock className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{e.minutes} min</span>
                </span>
              </header>
              <div className="px-5 py-4 sm:px-6">
                <ExerciseRenderer
                  structure={e.structure as FlexibleExerciseStructure}
                  compact={false}
                  locked={phase === 'running'}
                  interactive={phase === 'review'}
                  progress={progress[e.id]}
                  onAssess={(path, status, source) => assess(e.id, e.structure, {
                    [path]: progressRef.current[e.id]?.[path]?.status === status ? null : status,
                  }, source)}
                  onAssessMany={(changes, source) => assess(e.id, e.structure, changes, source)}
                />
              </div>
              {phase === 'review' && (
                <div className="border-t border-line px-5 py-2 sm:px-6">
                  <Link to={`/exercises/${e.id}`} state={{ from: location.pathname + location.search }}
                    className="inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
                    Ouvrir l’exercice <span className="hidden font-normal text-ink-faint sm:inline">(commentaires, solutions des élèves)</span> <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </section>
          );
        })}
        {phase === 'running' && (
          <button type="button" onClick={() => act('finish')} disabled={busy} className="fd-btn-primary min-h-11 self-center">
            <CheckCircle2 className="h-4 w-4" /> J’ai terminé
          </button>
        )}
        {phase === 'review' && (
          <Link to={planPath} className="fd-btn-primary min-h-11 self-center">Retour à ma préparation <ArrowRight className="h-4 w-4" /></Link>
        )}
      </div>
    </Page>
  );
}
