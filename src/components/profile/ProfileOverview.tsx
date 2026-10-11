// Onglet « Profil » du propriétaire (refonte du 11/10/2026) : un résumé de « Ma progression » (mêmes chiffres
// que /progression : GET /api/stats/progression/ via useProgression, dont il réchauffe le cache), les objectifs
// de notes et les publications. L'ancienne carte « Mon parcours » répétait l'en-tête : supprimée.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Dumbbell, GraduationCap, PenLine, RotateCcw, School } from 'lucide-react';
import { CardLink, CardsSkeleton, EmptyState, Section, SectionLink } from '@/components/space/Page';
import { useProgression } from '@/pages/progression/useProgression';
import { highlights, pickNextStep } from '@/pages/progression/nextStep';
import { STATUS } from '@/pages/progression/status';
import { practiceUrl, quizUrl } from '@/pages/progression/links';
import { hubPath, profileLevel } from '@/lib/api/hubApi';
import { GoalsList, PublicationsList, type Goal, type PublishedItem } from './ProfileBilanSection';

type LevelProfile = {
  user_type?: string;
  class_level?: number | string | { id: string | number; name: string } | null;
  class_level_name?: string | null;
} | null | undefined;

interface Props {
  username: string;
  /** Profil chargé (GET /users/<u>/) : seul le niveau sert ici. */
  profile: LevelProfile;
  userType: string;
  goals?: Goal[];
  editUrl: string;
  contributions: PublishedItem[];
}

const CHIP = {
  mastered: 'bg-brand-soft text-brand-hover', good: 'bg-brand-soft text-brand-hover', weak: 'bg-gold-soft text-gold-strong',
  started: 'bg-[#f2f1ee] text-ink-soft', todo: 'bg-[#f2f1ee] text-ink-soft',
} as const;

/** Résumé compact de « Ma progression » : le prochain pas, puis deux à quatre chiffres positifs. */
const ProgressSummary: React.FC<{ username: string; profile: Props['profile']; editUrl: string }> = ({ username, profile, editUrl }) => {
  const { data, failed, reload } = useProgression(username);
  const level = profileLevel({ profile });
  const startUrl = level ? hubPath('exercises', level.slug) : '/exercises';

  if (!data) {
    return failed ? (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
        <p className="flex-1 text-[13.5px] text-ink-soft">Ton résumé n’a pas pu se charger.</p>
        <button type="button" onClick={reload} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>
      </div>
    ) : <CardsSkeleton n={1} />;
  }

  const worked = data.summary.chapters.total - data.summary.chapters.todo;
  if (!data.level && worked === 0) {
    return (
      <EmptyState compact icon={GraduationCap} tone="gold" title="Indique ton niveau"
        text="Fidni te montre alors ton programme chapitre par chapitre, et ce qu’il te reste à travailler."
        action={<Link to={`${editUrl}#scolarite`} className="fd-btn-primary min-h-10">Indiquer mon niveau</Link>} />
    );
  }
  const facts = highlights(data);
  if (worked === 0 && facts.length === 0) {
    return (
      <EmptyState compact icon={Dumbbell} title="Ta progression se construit toute seule"
        text="Fais un exercice et dis pour chaque question si tu l’as réussie : tu verras ici où tu en es."
        action={<Link to={startUrl} className="fd-btn-primary min-h-10">S’entraîner <ArrowRight className="h-4 w-4" /></Link>} />
    );
  }

  const step = pickNextStep(data);
  const c = step?.chapter;
  const st = c ? STATUS[c.status] : null;
  const Icon = st?.icon;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {step && c && st && Icon && (
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <div className="min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${CHIP[c.status]}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden /> {st.label}
            </span>
            <p className="fd-display mt-2 text-[19px] leading-snug text-ink">
              <span className="text-ink-faint">{step.verb}</span> {c.name}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint line-clamp-2">{step.reason}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:w-[170px]">
            <Link to={practiceUrl(c.hub_url, c.id)} className="fd-btn-primary min-h-10 w-full justify-center">
              S’entraîner <ArrowRight className="h-4 w-4" />
            </Link>
            {/* Le quiz du chapitre seulement s'il existe (aucun en production au 11/10/2026). */}
            {c.quiz_ready && (
              <Link to={quizUrl(c.id)} className="fd-btn-ghost min-h-10 w-full justify-center">
                <Brain className="h-4 w-4" /> {c.skilliq ? 'Refaire le quiz' : 'Passer le quiz'}
              </Link>
            )}
          </div>
        </div>
      )}
      {facts.length > 0 && (
        <dl className={`grid grid-cols-2 gap-px bg-line ${step ? 'border-t border-line' : ''} ${facts.length > 2 ? 'sm:grid-cols-4' : ''}`}>
          {facts.map((h, i) => (
            <div key={h.key} className={`flex flex-col-reverse justify-end bg-[#fcfbf9] px-4 py-3 ${facts.length % 2 && i === facts.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
              <dt className="mt-0.5 text-[12px] leading-snug text-ink-faint">{h.label}</dt>
              <dd className={`fd-nums text-[18px] font-bold leading-tight ${h.value.startsWith('+') ? 'text-brand-hover' : 'text-ink'}`}>{h.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

export const ProfileOverview: React.FC<Props> = ({ username, profile, userType, goals, editUrl, contributions }) => {
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
            {/* Sans publication, l'état vide propose déjà d'en faire une. */}
            {contributions.length > 0 && (
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
          <ProgressSummary username={username} profile={profile} editUrl={editUrl} />
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
