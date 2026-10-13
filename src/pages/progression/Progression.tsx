// « Ma progression », la maîtrise d'abord (refonte du 13/10/2026). Trois questions, trois blocs, visibles sans défiler :
//   1. Ton prochain objectif (le plus visible) : une seule priorité, pourquoi, un bouton, les exercices ciblés ;
//   2. Ma progression : maîtrise estimée, évolution sur 30 jours, chapitres évalués — chacun avec sa portée et son
//      « comment c'est calculé » ; la régularité au second plan (« Mon activité ») ;
//   3. Mes chapitres : les prioritaires avec leur état et une action ; le détail (« Pourquoi ce statut ? ») à part.
// Ordinateur : l'objectif à gauche, la progression et les chapitres à droite. Téléphone : dans cet ordre.
// Sans classe : un état qui mène à la scolarité du profil. Professeur : la page explique qu'elle suit un élève.
// « ?chapitre=12 » (quiz, profil…) ouvre le détail de ce chapitre.
// Données : GET /api/stats/progression/ (apps/users/progression.py, maitrise.py, objectif.py), gardées pour le retour.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, RotateCcw, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { exercisesHome } from '@/components/layout/nav';
import { Page, PageHeader, EmptyState } from '@/components/space/Page';
import { useProgression } from './useProgression';
import { Objectif } from './Objectif';
import { MaProgression } from './MaProgression';
import { MesChapitres } from './MesChapitres';
import { ChapitreSheet } from './ChapitreSheet';

export function ProgressionPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { data, failed, reload, update } = useProgression(isAuthenticated && user ? String(user.id) : null);
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<number | null>(null);
  const initial = Number(params.get('chapitre')) || null;
  useEffect(() => { if (initial) setOpenId(initial); }, [initial]);
  const close = useCallback(() => {
    setOpenId(null);
    if (params.get('chapitre')) { params.delete('chapitre'); setParams(params, { replace: true }); }
  }, [params, setParams]);
  const goalSaved = useCallback((minutes: number) => {
    update((d) => ({ ...d, time: { ...d.time, goal_minutes: minutes },
      ...(d.regularite ? { regularite: { ...d.regularite, objectif_minutes: minutes } } : {}) }));
  }, [update]);
  const opened = useMemo(() => data?.chapters.find((c) => c.id === openId) ?? null, [data, openId]);

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;

  const isTeacher = user?.profile?.user_type === 'teacher';
  const levelLink = user ? `/profile/${user.username}/edit#scolarite` : '/complete-profile';
  const noLevel = !!data && !data.level;
  const nothingYet = !!data && !data.apercu?.commence && data.time.total_seconds === 0;

  return (
    <Page>
      <SEO title="Ma progression | Fidni" description="Où tu en es, si tu progresses, et quoi travailler maintenant." noindex />
      <PageHeader eyebrow={data?.level ? `Mon suivi · ${data.level.name}` : 'Mon suivi'} icon={TrendingUp} title="Ma progression" />

      {failed && !data && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Ta progression n’a pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={reload} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}
      {!data && !failed && <Skeleton />}

      {data && (isTeacher && (nothingYet || noLevel) ? (
        <EmptyState icon={Users} tone="ink" title="Cette page suit le travail d’un élève"
          text="Tes élèves y voient où ils en sont, s’ils progressent et quoi travailler ensuite. Leur travail se suit depuis tes classes."
          action={<Link to="/classrooms" className="fd-btn-primary min-h-10">Voir mes classes</Link>}
          secondary={<Link to="/exercises" className="fd-btn-ghost min-h-10">Voir les exercices</Link>} />
      ) : noLevel ? (
        <div data-tour="prog-resume">
          <EmptyState icon={GraduationCap} tone="gold" title="Indique ta classe"
            text="Fidni t’affichera le programme de ta classe, ce que tu maîtrises déjà et le chapitre à travailler ensuite."
            action={<Link to={levelLink} className="fd-btn-primary min-h-10">Indiquer ma classe</Link>}
            secondary={<Link to={exercisesHome(user)} className="fd-btn-ghost min-h-10">Voir les exercices</Link>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-5">
          {data.objectif ? (
            <Objectif data={data.objectif} className="lg:row-span-2" />
          ) : (
            <div data-tour="prog-resume" className="lg:row-span-2">
              <EmptyState icon={TrendingUp} title="Ta progression commence ici"
                text="Fais un exercice de ton niveau, puis dis pour chaque question si tu l’as réussie : Fidni te dira où tu en es et quoi travailler."
                action={<Link to={exercisesHome(user)} className="fd-btn-primary min-h-10">Commencer un exercice</Link>} />
            </div>
          )}
          {data.apercu && (
            <MaProgression apercu={data.apercu} chapters={data.chapters} regularite={data.regularite ?? null} onGoalSaved={goalSaved} />
          )}
          <MesChapitres chapters={data.chapters} onOpen={setOpenId} className="lg:col-start-2" />
        </div>
      ))}

      <ChapitreSheet chapter={opened} onClose={close} />
    </Page>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-5" role="status" aria-label="Chargement">
      <div className="h-[360px] animate-pulse rounded-2xl border border-line bg-white lg:row-span-2 lg:h-auto" />
      <div className="h-[260px] animate-pulse rounded-2xl border border-line bg-white" />
      <div className="h-[320px] animate-pulse rounded-2xl border border-line bg-white" />
    </div>
  );
}

export default ProgressionPage;
