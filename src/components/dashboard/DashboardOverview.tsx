/**
 * Accueil de l'élève connecté — « ce que tu fais maintenant » (refonte du 11/10/2026 : l'accueil empilait
 * bonjour, bandeau DS, bande de stats, Reprendre/À refaire, graphique souvent vide et grosses cartes).
 *   1. bonjour (date, niveau) ;
 *   2. UNE action principale (NextAction : préparer un DS proche › reprendre › commencer), ou « Tes premiers pas »
 *      pour un nouvel élève (niveau, premier exercice, premier DS annoncé : pas de quiz, aucun n'est prêt) ;
 *      puis « Où j'en suis » (13/10/2026, à la place de la ligne « ta semaine ») : maîtrise, évolution, chapitres
 *      évalués et la priorité du moment — mêmes calculs que Ma progression (GET /api/stats/apercu/) ;
 *   3. au plus trois blocs calmes : Ton prochain DS (s'il n'est pas déjà l'action), À refaire (3), Pour toi (3).
 * « Toi et ta classe » seulement avec des données ; le détail est dans Ma progression (/progression).
 * Données : /api/dashboard/overview/ (que des chiffres enregistrés), /api/devoirs/, /api/revision-lists/suggestions/,
 * /api/dashboard/recommended/, /api/classrooms/progress/weekly/.
 */
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { getDashboardOverview, getRecommendedContent, getWeeklyProgress, type DashboardOverview as Overview, type WeeklyProgress } from '@/lib/api';
import type { RecommendedContent } from '@/lib/api/dashboardApi';
import { getToRedo, type ToRedoItem } from '@/lib/api/revisionListApi';
import { PageHeader } from '@/components/space/Page';
import { NextTestReminder } from '@/components/devoirs/NextTestReminder';
import { nextTestVisible, useAnnounceLater, useNextTest } from '@/components/devoirs/useNextTest';
import { useAuth } from '@/contexts/AuthContext';
import { trackAction } from '@/lib/usage';
import { NextAction } from './NextAction';
import { FirstSteps } from './FirstSteps';
import { OuJenSuis } from './OuJenSuis';
import { useApercu } from './useApercu';
import { RedoBlock } from './RedoBlock';
import { ForYou } from './ForYou';
import { ClassChart } from './ClassChart';
import { REDO_SHOWN, chooseNext, easiest, firstSteps, hasClassChart, hasWeekData, sameTarget } from './home';

// Le formulaire « Annoncer un DS » n'est chargé qu'à l'ouverture (taxonomie, animations).
const TestFormModal = lazy(() => import('@/components/devoirs/TestFormModal').then((m) => ({ default: m.TestFormModal })));

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// Deux blocs côte à côte sur ordinateur (DS + À refaire), l'un sous l'autre sur téléphone ; seul, il prend la largeur.
const HALF = 'min-w-0 flex-1 basis-[380px]';

function HeroSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-line bg-white p-5 sm:p-7" role="status" aria-label="Chargement">
      <div className="h-3 w-28 rounded bg-[#f2f1ee]" />
      <div className="mt-3 h-6 w-2/3 rounded bg-[#efece6]" />
      <div className="mt-3 h-3 w-1/3 rounded bg-[#f2f1ee]" />
      <div className="mt-6 h-11 w-full rounded-xl bg-[#f2f1ee] md:w-44" />
    </div>
  );
}

export const DashboardOverview: React.FC<{ username?: string }> = ({ username }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.profile?.user_type === 'teacher';
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [recs, setRecs] = useState<RecommendedContent | null>(null);
  const [recsFailed, setRecsFailed] = useState(false);
  const [redo, setRedo] = useState<{ count: number; results: ToRedoItem[] } | null>(null);
  const [weekly, setWeekly] = useState<WeeklyProgress | null>(null);
  const ds = useNextTest();
  const apercu = useApercu(user && !isTeacher ? String(user.id) : null);
  const { later, dismiss } = useAnnounceLater();
  // Formulaire « Annoncer un DS » : monté au premier clic, gardé ensuite (animation de fermeture).
  const [announce, setAnnounce] = useState<'closed' | 'open' | 'never'>('never');
  const openAnnounce = () => { trackAction('annoncer-ds'); setAnnounce('open'); };

  useEffect(() => {
    let alive = true;
    getDashboardOverview()
      .then((d) => { if (alive) { setData(d); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [attempt]);

  const loadRecs = useCallback(() => {
    setRecsFailed(false);
    getRecommendedContent().then(setRecs).catch(() => setRecsFailed(true));
  }, []);

  useEffect(() => {
    loadRecs();
    getWeeklyProgress().then(setWeekly).catch(() => setWeekly(null));
  }, [loadRecs]);

  useEffect(() => {
    if (isTeacher) return;
    getToRedo().then(setRedo).catch(() => setRedo({ count: 0, results: [] }));
  }, [isTeacher]);

  const now = new Date();
  const hello = now.getHours() >= 18 || now.getHours() < 6 ? 'Bonsoir' : 'Bonjour';
  const today = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  const steps = data ? firstSteps(data, ds) : [];
  // Nouvel élève : ses premiers pas plutôt qu'une ligne de zéros.
  const newcomer = !!data && !isTeacher && data.totals.questions === 0 && steps.some((x) => !x.done);
  const choice = data ? chooseNext(data, ds.test, recs?.exercises ?? [], isTeacher) : null;
  // L'action principale attend ce dont elle dépend (pas de « Reprendre » remplacé une seconde plus tard par le DS).
  const needsRecs = newcomer || choice?.kind === 'start';
  const heroReady = !!data && ds.loaded && (!needsRecs || !!recs || recsFailed);

  // « Ton prochain DS » : pas en double avec l'action principale ; pour un nouvel élève, l'invitation est déjà un pas.
  const dsInHero = !newcomer && choice?.kind === 'ds';
  const showDs = heroReady && !isTeacher && !dsInHero && (newcomer ? !!ds.test : nextTestVisible(ds, later));
  const showRedo = !!redo && redo.results.length > 0;
  // Les contenus d'« À refaire » (les trois montrés) ne se répètent pas dans « Pour toi ».
  const redoShown = useMemo(() => new Set((showRedo ? redo!.results.slice(0, REDO_SHOWN) : []).map((x) => `${x.type}-${x.id}`)), [showRedo, redo]);
  const levelLink = user?.profile && !user.profile.onboarding_completed
    ? '/complete-profile' : `/profile/${encodeURIComponent(username ?? '')}/edit#scolarite`;
  const exercisesHub = data?.level_hub_url ?? '/exercises';

  const subtitle = !data ? undefined
    : newcomer ? 'Bienvenue sur Fidni ! Trois petits pas pour bien démarrer.'
      : isTeacher && !hasWeekData(data) ? 'Bienvenue dans ton espace.'
        : undefined;

  return (
    <>
      <PageHeader
        eyebrow={<>{today}{data?.level ? ` · ${data.level.name}` : ''}</>}
        title={<>{hello}{username ? <>, <span className="italic">{username}</span></> : ''}</>}
        subtitle={subtitle} />

      <div className="flex flex-col gap-10">
        {failed ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
            <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Ton accueil n’a pas pu se charger. Vérifie ta connexion.</p>
            <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }} className="fd-btn-ghost min-h-10">
              <RotateCcw className="h-4 w-4" /> Réessayer
            </button>
          </div>
        ) : !heroReady || !data || !choice ? (
          <HeroSkeleton />
        ) : newcomer ? (
          <FirstSteps steps={steps} data={data} exercise={easiest(recs?.exercises ?? [])} levelLink={levelLink} onAnnounce={openAnnounce} />
        ) : (
          <NextAction choice={choice} data={data} />
        )}

        {!isTeacher && !newcomer && !failed && (
          <OuJenSuis data={apercu.data} failed={apercu.failed} onRetry={apercu.reload}
            sameAsHero={!!choice && sameTarget(choice, apercu.data?.objectif ?? null)} />
        )}

        {(showDs || showRedo) && (
          <div className="flex flex-wrap items-start gap-x-6 gap-y-10">
            {showDs && <NextTestReminder state={ds} later={later} onLater={dismiss} onAnnounce={openAnnounce} className={HALF} />}
            {showRedo && <RedoBlock items={redo!.results} count={redo!.count} className={HALF} />}
          </div>
        )}

        <ForYou recs={recs} failed={recsFailed} onRetry={loadRecs} exercisesHub={exercisesHub} teacher={isTeacher} shownAbove={redoShown} />

        {hasClassChart(weekly) && <ClassChart progress={weekly} />}
      </div>

      {announce !== 'never' && (
        <Suspense fallback={null}>
          <TestFormModal open={announce === 'open'} onClose={() => setAnnounce('closed')}
            onSaved={(t) => { setAnnounce('closed'); ds.reload(); navigate(`/revisions/ds/${t.id}`); }} />
        </Suspense>
      )}
    </>
  );
};

export default DashboardOverview;
