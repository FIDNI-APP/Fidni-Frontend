/**
 * Dossiers des listes (10/10/2026) : Maths › niveau › chapitre, comme des dossiers qui contiennent les
 * contenus. Un dossier avec des contenus est un lien ; un dossier vide est grisé, dit « Vide pour
 * l'instant » et ne se clique pas. Utilisé par pages/content/ContentFolders.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Folder, FolderMinus, FolderOpen } from 'lucide-react';

export interface FolderItem {
  key: string | number;
  name: string;
  to: string;
  /** Contenus dans le dossier : 0 = dossier vide (non cliquable). */
  count: number;
  /** « 12 exercices ». */
  countLabel: string;
  /** Deuxième information : « 9 chapitres sur 14 », « 2ème Bac SM · 2ème Bac PC ». */
  sub?: string;
  /** Élève connecté : contenus du dossier terminés (réussis / à revoir). */
  progress?: { done: number; success: number } | null;
  /** Mot pour les contenus terminés : [« fait », « faits »], [« lue », « lues »]. */
  doneWord?: [string, string];
  /** Pastille (« Ton niveau »). */
  badge?: string;
  /** Texte d'un dossier vide (défaut : « Vide pour l'instant »). */
  emptyLabel?: string;
  onOpen?: () => void;
}

export interface FolderGroup {
  title: string | null;
  items: FolderItem[];
}

const FolderCard: React.FC<{ item: FolderItem }> = ({ item }) => {
  const empty = item.count <= 0;
  if (empty) {
    return (
      <div aria-disabled="true" title={`${item.name} : ${item.emptyLabel ?? 'vide pour l’instant'}`}
        className="flex h-full cursor-default items-center gap-3 rounded-2xl border border-dashed border-line bg-paper px-3.5 py-2.5 sm:p-4">
        {/* Téléphone : plus compact, les dossiers pleins restent faciles à repérer. */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-[#b3aea5] sm:h-11 sm:w-11" aria-hidden>
          <FolderMinus className="h-[22px] w-[22px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium leading-snug text-ink-faint line-clamp-2">{item.name}</span>
          <span className="mt-0.5 block text-[12px] text-[#a19c93]">{item.emptyLabel ?? 'Vide pour l’instant'}</span>
        </span>
      </div>
    );
  }
  const p = item.progress;
  const done = p ? Math.min(p.done, item.count) : 0;
  const success = p ? Math.min(p.success, done) : 0;
  return (
    <Link to={item.to} onClick={item.onOpen}
      className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-hover" aria-hidden>
        <Folder className="h-[22px] w-[22px] group-hover:hidden" />
        <FolderOpen className="hidden h-[22px] w-[22px] group-hover:block" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-ink line-clamp-2">{item.name}</span>
          {item.badge && (
            <span className="mt-px shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[10.5px] font-semibold text-gold-strong">{item.badge}</span>
          )}
        </span>
        <span className="fd-nums mt-0.5 block text-[12.5px] text-ink-faint">
          {item.countLabel}
          {item.sub && <> · {item.sub}</>}
          {p && done > 0 && <> · <span className="text-ink-soft">{done} {(item.doneWord ?? ['fait', 'faits'])[done > 1 ? 1 : 0]}</span></>}
        </span>
        {/* Barre : réussis (vert) et à revoir (or) ; la même chose en mots pour les lecteurs d'écran. */}
        {p && done > 0 && (
          <span className="sr-only"> : {success} réussi{success > 1 ? 's' : ''}, {done - success} à revoir</span>
        )}
        {p && done > 0 && (
          <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
            <span className="h-full bg-brand" style={{ width: `${(success / item.count) * 100}%` }} />
            <span className="h-full bg-gold" style={{ width: `${((done - success) / item.count) * 100}%` }} />
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
    </Link>
  );
};

/** Dossiers, en groupes titrés (sous-domaines : Analyse, Algèbre…) quand il y en a plusieurs. */
export const FolderGrid: React.FC<{ groups: FolderGroup[]; label: string }> = ({ groups, label }) => {
  const titled = groups.length > 1;
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g, gi) => {
        const filled = g.items.filter((i) => i.count > 0).length;
        const headingId = `dossiers-${gi}`;
        return (
          <section key={g.title ?? gi} aria-labelledby={titled && g.title ? headingId : undefined} aria-label={titled && g.title ? undefined : label}>
            {titled && g.title && (
              <h2 id={headingId} className="mb-2.5 flex items-baseline gap-2 text-[12px] font-semibold uppercase tracking-[.08em] text-ink-faint">
                {g.title}
                <span className="fd-nums font-medium normal-case tracking-normal">· {filled}/{g.items.length}</span>
              </h2>
            )}
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((item) => <li key={item.key}><FolderCard item={item} /></li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

/** Dossiers fantômes pendant le chargement. */
export const FolderSkeleton: React.FC<{ n?: number }> = ({ n = 6 }) => (
  <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Chargement des dossiers">
    {Array.from({ length: n }, (_, i) => (
      <li key={i} className="flex animate-pulse items-center gap-3 rounded-2xl border border-line bg-white p-3.5 sm:p-4">
        <span className="h-11 w-11 shrink-0 rounded-xl bg-[#f2f1ee]" />
        <span className="flex-1">
          <span className="block h-4 w-3/4 rounded bg-[#efece6]" />
          <span className="mt-2 block h-3 w-1/3 rounded bg-[#f2f1ee]" />
        </span>
      </li>
    ))}
  </ul>
);

export default FolderGrid;
