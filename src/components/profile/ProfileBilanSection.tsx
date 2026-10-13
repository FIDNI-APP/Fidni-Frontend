// src/components/profile/ProfileBilanSection.tsx
//
// Briques du profil (refonte du 11/10/2026) : les publications (visibles de tous) et les objectifs de notes
// (propriétaire seulement). L'ancien « Bilan » (maîtrise par chapitre, « Passer le test ») n'était plus
// accessible : la progression vit sur /progression, le profil n'en garde qu'un résumé (ProfileOverview).
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye, PenLine, Plus, Target, ThumbsUp } from 'lucide-react';
import { EmptyState } from '@/components/space/Page';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateContent } from '@/lib/features';

/** Une publication de l'utilisateur (GET /users/<u>/contributions/). */
export interface PublishedItem {
  id: number | string;
  type?: string;
  title: string;
  subject?: { name?: string } | null;
  chapters?: { name?: string }[];
  vote_count?: number;
  view_count?: number;
}

/** Objectif de notes : moyenne actuelle → moyenne visée, sur 20 (privé). */
export interface Goal {
  subject: number | string;
  subject_name?: string;
  min_grade: number | string;
  max_grade: number | string;
}

const SHOWN = 5;

/**
 * État vide discret du profil (pas une grande illustration par section : le profil en a deux) : une carte en
 * pointillés, une icône, une phrase et un bouton — comme « Un DS bientôt ? » sur l'accueil.
 */
const QuietEmpty: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  action: React.ReactNode;
  tone?: 'gold' | 'ink';
}> = ({ icon: Icon, title, text, action, tone = 'ink' }) => (
  <div className="flex items-start gap-3.5 rounded-2xl border border-dashed border-[#d8d4cc] bg-white p-4">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === 'gold' ? 'bg-gold-soft text-gold-strong' : 'bg-[#f2f1ee] text-ink-soft'}`} aria-hidden>
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[14.5px] font-semibold leading-snug text-ink">{title}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">{text}</p>
      <div className="mt-3">{action}</div>
    </div>
  </div>
);

const contentPath = (item: PublishedItem) =>
  `/${item.type === 'lesson' ? 'lessons' : item.type === 'exam' ? 'exams' : 'exercises'}/${item.id}`;

/** Publications en une carte : titre, matière · chapitre, votes et vues ; « Voir les N » déplie le reste. */
export const PublicationsList: React.FC<{ items: PublishedItem[]; isOwner: boolean }> = ({ items, isOwner }) => {
  const [all, setAll] = useState(false);
  const { user } = useAuth();
  if (items.length === 0) {
    // Création de contenu : l'équipe seulement pour l'instant (12/10/2026).
    return isOwner ? (canCreateContent(user) ? (
      <QuietEmpty icon={PenLine} title="Tu n’as rien publié pour l’instant"
        text="Proposer un exercice est un bon moyen de vérifier que tu maîtrises un chapitre."
        action={<Link to="/exercises/new" className="fd-btn-ghost min-h-10 text-[13px]"><Plus className="h-4 w-4" /> Proposer un exercice</Link>} />
    ) : (
      <EmptyState compact icon={PenLine} tone="ink" title="Rien de publié pour l’instant"
        text="Tes exercices, leçons et examens publiés apparaîtront ici." />
    )
    ) : (
      <EmptyState compact icon={PenLine} tone="ink" title="Rien de publié pour l’instant"
        text="Ses exercices, leçons et examens apparaîtront ici." />
    );
  }
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <ul className="divide-y divide-line">
        {shown.map((item) => {
          const votes = item.vote_count ?? 0;
          const views = item.view_count ?? 0;
          const where = [item.subject?.name, item.chapters?.[0]?.name].filter(Boolean).join(' · ');
          return (
            <li key={item.id}>
              <Link to={contentPath(item)}
                className="group flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-[#fcfbf9] focus:outline-none focus-visible:bg-[#f7f6f3] sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink group-hover:underline">{item.title}</span>
                  {where && <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">{where}</span>}
                </span>
                <span className="fd-nums flex shrink-0 items-center gap-3 text-[12px] text-ink-faint">
                  <span className="inline-flex items-center gap-1" title="Votes">
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> {votes}<span className="sr-only"> vote{votes > 1 ? 's' : ''}</span>
                  </span>
                  <span className="inline-flex items-center gap-1" title="Vues">
                    <Eye className="h-3.5 w-3.5" aria-hidden /> {views}<span className="sr-only"> vue{views > 1 ? 's' : ''}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > SHOWN && (
        <button type="button" onClick={() => setAll((v) => !v)}
          className="flex min-h-11 w-full items-center justify-center gap-1 border-t border-line text-[13px] font-semibold text-brand-hover hover:bg-[#fcfbf9] hover:underline">
          {all ? 'Voir moins' : <>Voir les {items.length} publications <ChevronRight className="h-3.5 w-3.5" /></>}
        </button>
      )}
    </div>
  );
};

/** Moyenne actuelle → objectif, sur l'échelle 0–20 : le chemin qui reste, sans rien inventer. */
export const GoalsList: React.FC<{ goals: Goal[]; editUrl: string }> = ({ goals, editUrl }) => {
  if (goals.length === 0) {
    return (
      <QuietEmpty icon={Target} tone="gold" title="Fixe-toi un objectif"
        text="Note ta moyenne actuelle et celle que tu vises : tu verras le chemin qui reste."
        action={<Link to={`${editUrl}#objectifs`} className="fd-btn-ghost min-h-10 text-[13px]"><Plus className="h-4 w-4" /> Fixer un objectif</Link>} />
    );
  }
  return (
    <ul className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
      {goals.map((g) => {
        const now = Number(g.min_grade), target = Number(g.max_grade);
        const lo = Math.min(now, target), hi = Math.max(now, target);
        return (
          <li key={String(g.subject)}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[14px] font-semibold text-ink">{g.subject_name ?? 'Matière'}</span>
              <span className="fd-nums shrink-0 text-[12.5px] text-ink-faint">
                {now.toLocaleString('fr-FR')} → <b className="font-bold text-brand-hover">{target.toLocaleString('fr-FR')}</b> / 20
              </span>
            </div>
            <span className="relative block h-1.5 rounded-full bg-[#f2f1ee]" role="img"
              aria-label={`Moyenne actuelle ${now.toLocaleString('fr-FR')}, objectif ${target.toLocaleString('fr-FR')} sur 20`}>
              <span className="absolute inset-y-0 left-0 rounded-full bg-[#d8d4cc]" style={{ width: `${(lo / 20) * 100}%` }} />
              <span className="absolute inset-y-0 rounded-full bg-brand" style={{ left: `${(lo / 20) * 100}%`, width: `${((hi - lo) / 20) * 100}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default PublicationsList;
