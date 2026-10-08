/**
 * DS blanc (« Mon prochain DS », 08/10/2026) : /revisions/ds/:id/blanc
 *
 * 1. Avant : les exercices tirés (un par chapitre, le plus fragile d'abord), la durée, les règles.
 * 2. Pendant : chronomètre collé en haut (le temps restant, puis le dépassement), énoncés sans
 *    solution ni auto-évaluation (ExerciseRenderer « locked »). L'horloge est celle du serveur :
 *    recharger la page ou revenir plus tard ne la remet pas à zéro.
 * 3. Après : le temps mis, puis la correction question par question (solutions + Réussi / À revoir),
 *    qui met à jour la préparation du DS et Ma progression.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Flag, Loader2, Timer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { api } from '@/lib/api/apiClient';
import { devoirsApi, plural, testTitle, type MockExam, type UpcomingTest } from '@/lib/api/devoirsApi';
import { ExerciseRenderer, type AssessChanges } from '@/components/content/viewer/ExerciseRenderer';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { assessablePaths } from '@/lib/utils/contentHelpers';
import type { AssessmentStatus } from '@/types/content';
import { Card, DifficultyDot } from '@/components/devoirs/ui';

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const { setCrumbs } = useBreadcrumb();
  const crumbTitle = data ? testTitle(data.test) : null;
  useEffect(() => {
    setCrumbs([{ label: 'Révisions', to: '/revision-lists' },
      { label: crumbTitle ?? 'Préparation du DS', to: `/revisions/ds/${id}` }, { label: 'DS blanc' }]);
  }, [crumbTitle, id, setCrumbs]);
  useEffect(() => () => setCrumbs(null), [setCrumbs]);

  const load = useCallback(() => {
    if (!id) return;
    devoirsApi.mock(Number(id)).then(setData)
      .catch((e) => setError(e?.response?.status === 404 ? 'Ce DS n’existe plus.' : 'Le DS blanc n’a pas pu être chargé.'));
  }, [id]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) { navigate('/login'); return; }
    if (isAuthenticated) load();
  }, [authLoading, isAuthenticated, load, navigate]);

  const phase: 'intro' | 'running' | 'review' = !data?.started_at ? 'intro' : !data.done_at ? 'running' : 'review';
  const total = (data?.minutes ?? 0) * 60;
  const elapsed = data?.started_at ? Math.max(0, Math.floor((now - Date.parse(data.started_at)) / 1000)) : 0;
  const remaining = total - elapsed;

  // Pendant l'épreuve : l'horloge avance chaque seconde ; quitter la page demande confirmation.
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
    try {
      const next = await devoirsApi.mockAction(data.test.id, action, action === 'finish' ? elapsed : undefined);
      setData(next);
      setNow(Date.now());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Ça n’a pas marché : vérifie ta connexion et réessaie.');
    } finally {
      setBusy(false);
    }
  };

  // Correction d'une question (même enregistrement que sur la page de l'exercice).
  const assess = async (exerciseId: number, structure: FlexibleExerciseStructure, changes: AssessChanges) => {
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
      await api.post(`/contents/${exerciseId}/assess_many/`, completion ? { assessments: changes, completion } : { assessments: changes });
    } catch {
      setProgress((cur) => ({ ...cur, [exerciseId]: before }));
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-[15px] text-ink-soft">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="fd-btn-ghost" onClick={() => { setError(null); load(); }}>Réessayer</button>
          <Link to={`/revisions/ds/${id}`} className="fd-btn-primary">Retour à la préparation</Link>
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="mx-auto max-w-4xl px-4 py-8" aria-busy><div className="h-64 animate-pulse rounded-2xl bg-white" /></div>;
  }

  const back = `/revisions/ds/${data.test.id}`;
  const corrected = data.exercises.reduce((n, e) => n + assessablePaths(e.structure).filter((p) => progress[e.id]?.[p]).length, 0);
  const toCorrect = data.exercises.reduce((n, e) => n + assessablePaths(e.structure).length, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 md:px-6 md:pt-8">
      {phase !== 'running' && (
        <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-faint hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Préparation du DS
        </Link>
      )}

      {phase === 'intro' && (
        <Card className="mt-4">
          <p className="text-[12px] font-bold uppercase tracking-[.07em] text-ink-faint">DS blanc · {testTitle(data.test)}</p>
          <h1 className="fd-display mt-1 text-[28px] leading-tight text-ink">
            {plural(data.exercises.length, 'exercice', 'exercices')} · {data.minutes} min
          </h1>
          <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-ink-soft">
            <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Prévois {data.minutes} minutes au calme : le chronomètre tourne même si tu quittes la page.</li>
            <li className="flex gap-2.5"><Flag className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Comme en classe : brouillon, calculatrice si elle est permise, et pas de solution avant la fin.</li>
            <li className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> À la fin, tu te corriges question par question : ta préparation se met à jour.</li>
          </ul>
          <ol className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
            {data.exercises.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="fd-nums inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[12.5px] font-bold text-ink-soft">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{e.chapter ?? e.title}</p>
                  <p className="mt-0.5"><DifficultyDot level={e.difficulty} /></p>
                </div>
                <span className="fd-nums text-[12.5px] font-semibold text-ink-soft">{e.minutes} min</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => act('start')} disabled={busy || !data.exercises.length} className="fd-btn-primary mt-5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />} Commencer le DS blanc
          </button>
        </Card>
      )}

      {phase === 'running' && (
        <div className="sticky top-[60px] z-20 -mx-4 mb-5 border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur md:-mx-6 md:px-6">
          <div className="flex items-center gap-3">
            <span className={`fd-nums inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[17px] font-bold ${
              remaining < 0 ? 'bg-[#fbecea] text-[#a23b34]' : remaining < 600 ? 'bg-gold-soft text-[#8a6318]' : 'bg-[#f2f1ee] text-ink'}`}
              style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }} role="timer" aria-live="off" aria-label={remaining < 0 ? 'Temps dépassé' : 'Temps restant'}>
              <Timer className="h-4 w-4" />{remaining < 0 ? `+${clock(remaining)}` : clock(remaining)}
            </span>
            <span className="hidden min-w-0 truncate text-[13px] text-ink-faint sm:inline">
              {remaining < 0 ? 'Temps écoulé : termine ta phrase, puis clique sur Terminer.' : `${testTitle(data.test)} · ${data.minutes} min`}
            </span>
            <button type="button" onClick={() => act('finish')} disabled={busy} className="fd-btn-primary ml-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Terminer
            </button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <Card className="mt-4 border-brand/25 bg-brand-soft/50">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white"><CheckCircle2 className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <h1 className="fd-display text-[24px] leading-tight text-ink">DS blanc terminé{data.seconds !== null ? ` en ${minutesLabel(data.seconds)}` : ''}</h1>
              <p className="mt-0.5 text-[13.5px] text-ink-soft">
                {data.seconds !== null && data.seconds > total ? `${minutesLabel(data.seconds - total)} de plus que prévu (${data.minutes} min) : entraîne-toi à aller plus vite.`
                  : `Prévu : ${data.minutes} min.`} Corrige-toi maintenant, question par question.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="flex items-center justify-between text-[12.5px] font-semibold text-ink-soft">
              Questions corrigées <span className="fd-nums">{corrected} / {toCorrect}</span>
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${toCorrect ? (corrected / toCorrect) * 100 : 0}%` }} />
            </div>
          </div>
        </Card>
      )}

      {phase !== 'intro' && (
        <div className="mt-5 flex flex-col gap-5">
          {phase === 'running' && remaining < 0 && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-[13.5px] text-[#9c3b2e]">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Le temps prévu est écoulé. Termine quand tu es prêt : ton temps réel sera noté.
            </p>
          )}
          {data.exercises.map((e, i) => (
            <Card key={e.id}>
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-3">
                <span className="fd-display text-[19px] text-ink">Exercice {i + 1}</span>
                {e.chapter && <span className="text-[12.5px] text-ink-faint">{e.chapter}</span>}
                <span className="fd-nums ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft"><Clock className="h-3.5 w-3.5" />{e.minutes} min</span>
              </div>
              <ExerciseRenderer
                structure={e.structure as FlexibleExerciseStructure}
                compact={false}
                locked={phase === 'running'}
                interactive={phase === 'review'}
                progress={progress[e.id]}
                onAssess={(path, status) => assess(e.id, e.structure, {
                  [path]: progressRef.current[e.id]?.[path]?.status === status ? null : status,
                })}
                onAssessMany={(changes) => assess(e.id, e.structure, changes)}
              />
              {phase === 'review' && (
                <Link to={`/exercises/${e.id}`} className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-hover hover:underline">
                  Ouvrir l’exercice (commentaires, solutions des élèves) <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </Card>
          ))}
          {phase === 'running' && (
            <button type="button" onClick={() => act('finish')} disabled={busy} className="fd-btn-primary self-center">
              <CheckCircle2 className="h-4 w-4" /> J’ai terminé
            </button>
          )}
          {phase === 'review' && (
            <Link to={back} className="fd-btn-primary self-center">Retour à ma préparation <ArrowRight className="h-4 w-4" /></Link>
          )}
        </div>
      )}
    </div>
  );
}
