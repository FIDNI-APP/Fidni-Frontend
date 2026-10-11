// « Ma progression » (refonte du 11/10/2026, même langage que Réviser) : la page commence par ce qu'il faut faire.
//   1. Ton prochain pas : le chapitre à travailler maintenant (S'entraîner / Le cours), puis le bilan en chiffres
//      positifs (chapitres commencés, questions réussies cette semaine, temps, série) ;
//   2. Tes notions : points forts et notions à retravailler (seulement s'il y en a) ;
//   3. Mon programme : les chapitres, à renforcer d'abord ; le détail du chapitre choisi à côté (téléphone : dessous) ;
//   4. Mon activité : un seul graphique (cette semaine / depuis le début).
// Première visite : un seul état vide (« Commencer un exercice de mon niveau »), puis le programme. Sans classe :
// un état vide qui mène à la scolarité du profil. Professeur : la page explique qu'elle suit le travail d'un élève.
// Affichage immédiat au retour sur la page (dernières données gardées), mise à jour en arrière-plan.
// Données : GET /api/stats/progression/ (backend apps/users/progression.py).
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BookOpen, GraduationCap, RotateCcw, Sprout, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { exercisesHome } from '@/components/layout/nav';
import { Page, PageHeader, EmptyState, CardsSkeleton } from '@/components/space/Page';
import { useProgression } from './useProgression';
import { Overview } from './Overview';
import { Notions } from './Notions';
import { Programme, type Focus } from './Programme';
import { Activity } from './Activity';
import { pickNextStep } from './nextStep';
import { lessonsHub } from './links';

export function ProgressionPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { data, failed, reload } = useProgression(isAuthenticated && user ? String(user.id) : null);
  // « ?chapitre=12 » (quiz, accueil, profil…) : ce chapitre est choisi d'office et amené à l'écran.
  const [params] = useSearchParams();
  const initial = Number(params.get('chapitre')) || null;
  const [focus, setFocus] = useState<Focus | null>(null);
  useEffect(() => { if (initial) setFocus({ id: initial, at: Date.now() }); }, [initial]);
  const show = useCallback((id: number) => setFocus({ id, at: Date.now() }), []);

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;

  const isTeacher = user?.profile?.user_type === 'teacher';
  const levelLink = user ? `/profile/${user.username}/edit#scolarite` : '/complete-profile';
  const home = exercisesHome(user);
  const nothingYet = !!data && data.summary.questions === 0 && data.time.total_seconds === 0
    && data.chapters.every((c) => c.status === 'todo');
  const noLevel = !!data && !data.level && data.chapters.length === 0;

  const subtitle = isTeacher && nothingYet ? 'Le suivi d’un élève : son programme, ce qu’il maîtrise et quoi travailler.'
    : data?.level ? `Ton programme de ${data.level.name} : où tu en es, et quoi travailler maintenant.`
      : 'Ce que tu as travaillé, et quoi faire ensuite.';

  return (
    <Page>
      <SEO title="Ma progression | Fidni" description="Ce que tu maîtrises et ce qui reste à travailler." noindex />
      <PageHeader eyebrow="Mon suivi" icon={TrendingUp} title="Ma progression" subtitle={subtitle} />

      {failed && !data && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Ta progression n’a pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={reload} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}
      {!data && !failed && <Skeleton />}

      {data && (isTeacher && (nothingYet || noLevel) ? (
        <EmptyState icon={Users} tone="ink" title="Cette page suit le travail d’un élève"
          text="Tes élèves y voient leur programme, ce qu’ils maîtrisent et quoi travailler ensuite. Leur travail se suit depuis tes classes."
          action={<Link to="/classrooms" className="fd-btn-primary min-h-10">Voir mes classes</Link>}
          secondary={<Link to="/exercises" className="fd-btn-ghost min-h-10">Voir les exercices</Link>} />
      ) : noLevel ? (
        <div data-tour="prog-resume">
          <EmptyState icon={GraduationCap} tone="gold" title="Indique ta classe"
            text="Fidni t’affichera le programme de ta classe, ce que tu maîtrises déjà et le chapitre à travailler ensuite."
            action={<Link to={levelLink} className="fd-btn-primary min-h-10">Indiquer ma classe</Link>}
            secondary={<Link to="/exercises" className="fd-btn-ghost min-h-10">Voir les exercices</Link>} />
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {nothingYet ? (
            <div data-tour="prog-resume">
              <EmptyState icon={Sprout} title="Ta progression commence ici"
                text="Fais un exercice de ton niveau, puis dis pour chaque question si tu l’as réussie : cette page te montrera ce que tu maîtrises et quoi travailler ensuite."
                action={<Link to={home} className="fd-btn-primary min-h-10">Commencer un exercice de mon niveau</Link>}
                secondary={<Link to={lessonsHub(home) ?? '/lessons'} className="fd-btn-ghost min-h-10"><BookOpen className="h-4 w-4" /> Les leçons</Link>} />
            </div>
          ) : (
            <>
              <Overview data={data} onShow={show} />
              <Notions strengths={data.strengths} weaknesses={data.weaknesses} onShow={show} />
            </>
          )}
          <Programme chapters={data.chapters} levelName={data.level?.name ?? null} levelLink={levelLink}
            preferred={nothingYet ? null : pickNextStep(data)?.chapter.id ?? null} focus={focus} />
          {!nothingYet && <Activity data={data} onShow={show} />}
        </div>
      ))}
    </Page>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-10" role="status" aria-label="Chargement">
      <div>
        <div className="mb-3 h-6 w-44 animate-pulse rounded bg-[#efece6]" />
        <div className="h-[188px] animate-pulse rounded-3xl border border-line bg-white" />
      </div>
      <div>
        <div className="mb-3 h-6 w-40 animate-pulse rounded bg-[#efece6]" />
        <CardsSkeleton n={4} />
      </div>
    </div>
  );
}

export default ProgressionPage;
