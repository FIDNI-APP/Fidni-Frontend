// Onglet « Profil » du propriétaire (refonte du 11/10/2026) : un résumé de « Ma progression » (13/10/2026 : le bloc
// « Où j'en suis » de l'accueil, mêmes chiffres que /progression), les objectifs de notes et les publications.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Dumbbell, GraduationCap, PenLine, School } from 'lucide-react';
import { CardLink, EmptyState, Section, SectionLink } from '@/components/space/Page';
import { OuJenSuis } from '@/components/dashboard/OuJenSuis';
import { useApercu } from '@/components/dashboard/useApercu';
import { hubPath, profileLevel } from '@/lib/api/hubApi';
import { GoalsList, PublicationsList, type Goal, type PublishedItem } from './ProfileBilanSection';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateContent } from '@/lib/features';

type LevelProfile = {
  user_type?: string;
  class_level?: number | string | { id: string | number; name: string } | null;
  class_level_name?: string | null;
} | null | undefined;

interface Props {
  /** Profil chargé (GET /users/<u>/) : seul le niveau sert ici. */
  profile: LevelProfile;
  userType: string;
  goals?: Goal[];
  editUrl: string;
  contributions: PublishedItem[];
}

/** Résumé de « Ma progression » : le même bloc « Où j'en suis » que l'accueil (GET /api/stats/apercu/). */
const ProgressSummary: React.FC<{ viewerId: string | null; profile: Props['profile']; editUrl: string }> = ({ viewerId, profile, editUrl }) => {
  const { data, failed, reload } = useApercu(viewerId);
  const level = profileLevel({ profile });
  const startUrl = level ? hubPath('exercises', level.slug) : '/exercises';
  if (data && !data.level) {
    return (
      <EmptyState compact icon={GraduationCap} tone="gold" title="Indique ton niveau"
        text="Fidni te montre alors ton programme chapitre par chapitre, ce que tu maîtrises et quoi travailler ensuite."
        action={<Link to={`${editUrl}#scolarite`} className="fd-btn-primary min-h-10">Indiquer mon niveau</Link>} />
    );
  }
  if (data && !data.apercu.commence) {
    return (
      <EmptyState compact icon={Dumbbell} title="Ta progression se construit toute seule"
        text="Fais un exercice et dis pour chaque question si tu l’as réussie : tu verras ici où tu en es."
        action={<Link to={startUrl} className="fd-btn-primary min-h-10">S’entraîner <ArrowRight className="h-4 w-4" /></Link>} />
    );
  }
  return <OuJenSuis data={data} failed={failed} onRetry={reload} variant="profile" />;
};

export const ProfileOverview: React.FC<Props> = ({ profile, userType, goals, editUrl, contributions }) => {
  const { user: viewer } = useAuth();
  const canCreate = canCreateContent(viewer);
  const isTeacher = userType === 'teacher';
  const publications = (
    <Section id="publications" title="Mes publications" count={contributions.length}>
      <PublicationsList items={contributions} isOwner />
    </Section>
  );

  if (isTeacher) {
    return (
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {publications}
        <Section id="enseigner" title="Enseigner">
          <div className="grid gap-3">
            <CardLink to="/classrooms">
              <span className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden><School className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink group-hover:underline">Mes classes</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-faint">Crée une classe et partage des fiches de TD.</span>
                </span>
              </span>
            </CardLink>
            {/* Sans publication, l'état vide propose déjà d'en faire une. Création : l'équipe seulement (12/10/2026). */}
            {contributions.length > 0 && canCreate && (
              <CardLink to="/exercises/new">
                <span className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden><PenLine className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink group-hover:underline">Proposer un exercice</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-faint">Pour tes élèves et tous ceux de ton niveau.</span>
                  </span>
                </span>
              </CardLink>
            )}
          </div>
        </Section>
      </div>
    );
  }

  // Téléphone : progression, objectifs, publications ; ordinateur : objectifs dans la colonne de droite.
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <Section id="ma-progression" title="Ma progression" className="lg:col-start-1 lg:row-start-1"
        action={<SectionLink to="/progression">Tout voir ›</SectionLink>}>
        <div data-tour="profil-resume">
          <ProgressSummary viewerId={viewer ? String(viewer.id) : null} profile={profile} editUrl={editUrl} />
        </div>
      </Section>
      {goals && (
        <Section id="objectifs" title="Mes objectifs" className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
          // Sans objectif, l'état vide porte l'action ; l'espace réservé garde les titres alignés sur ordinateur.
          action={goals.length ? <SectionLink to={`${editUrl}#objectifs`}>Modifier</SectionLink> : <span className="block min-h-10" aria-hidden />}>
          <GoalsList goals={goals} editUrl={editUrl} />
        </Section>
      )}
      <div className="lg:col-start-1 lg:row-start-2">{publications}</div>
    </div>
  );
};

export default ProfileOverview;
