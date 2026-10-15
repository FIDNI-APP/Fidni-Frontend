/**
 * Dossiers des listes (10/10/2026) : Maths › niveau › chapitre, comme des dossiers qui contiennent les
 * contenus. Un dossier avec des contenus est un lien ; un dossier vide est grisé, dit « Vide pour
 * l'instant » et ne se clique pas. Utilisé par pages/content/ContentFolders.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';

export interface FolderItem {
  key: string | number;
  name: string;
  to: string;
  /** Contenus dans le dossier : 0 = dossier vide (non cliquable). */
  count: number;
  /** « 12 exercices ». */
  countLabel: string;
  /** Deuxième information : « 9 chapitres sur 14 », « 2ème Bac SM · 2ème Bac PC/SVT ». */
  sub?: string;
  /** Élève connecté : contenus du dossier terminés (réussis / à revoir). */
  progress?: { done: number; success: number } | null;
  /** Mot pour les contenus terminés : [« fait », « faits »], [« lue », « lues »]. */
  doneWord?: [string, string];
  /** Pastille (« Ton niveau »). */
  badge?: string;
  /** Texte d'un dossier vide (défaut : « Vide pour l'instant »). */
  emptyLabel?: string;
  /** Ancien dossier absorbé par celui-ci (« Aussi : dénombrement »). */
  aussi?: string[];
  onOpen?: () => void;
}

export interface FolderGroup {
  title: string | null;
  items: FolderItem[];
}

/**
 * Un dossier « grand format », comme dans un explorateur de fichiers : onglet, feuilles qui dépassent, face
 * avant où sont écrits le nom et le nombre de contenus. Au survol, la face s'entrouvre et les feuilles
 * montent. Vide : silhouette grise, sans feuilles, pas un lien.
 */
const FolderCard: React.FC<{ item: FolderItem }> = ({ item }) => {
  const empty = item.count <= 0;
  const p = item.progress;
  const done = p ? Math.min(p.done, item.count) : 0;
  const success = p ? Math.min(p.success, done) : 0;
  const aussi = item.aussi?.length ? t('Aussi : {list}', { list: item.aussi.join(', ') }) : null;

  if (empty) {
    return (
      <div aria-disabled="true" title={t('{name} : {label}', { name: item.name, label: item.emptyLabel ? t(item.emptyLabel) : t('vide pour l’instant') })}
        className="relative h-[150px] cursor-default select-none sm:h-[168px]">
        <span aria-hidden className="absolute start-0 top-0 h-6 w-[42%] rounded-t-[10px] border border-b-0 border-dashed border-[#d9d4cb] bg-[#f4f2ee]" />
        <span className="absolute inset-x-0 bottom-0 top-[18px] flex flex-col justify-end rounded-[14px] rounded-ss-none border border-dashed border-[#d9d4cb] bg-[#f7f6f3] p-3.5 sm:p-4">
          <span className="text-[13.5px] font-semibold leading-snug text-ink-faint line-clamp-3 sm:text-[14.5px]">{item.name}</span>
          <span className="mt-1 text-[12px] text-[#a19c93]">{item.emptyLabel ? t(item.emptyLabel) : t('Vide pour l’instant')}</span>
          {aussi && <span className="mt-0.5 truncate text-[11px] text-[#a19c93]">{aussi}</span>}
        </span>
      </div>
    );
  }

  return (
    <Link to={item.to} onClick={item.onOpen}
      aria-label={p && done > 0
        ? (success > 1
          ? t('{name} : {count}, {s} réussis, {r} à revoir', { name: item.name, count: item.countLabel, s: success, r: done - success })
          : t('{name} : {count}, {s} réussi, {r} à revoir', { name: item.name, count: item.countLabel, s: success, r: done - success }))
        : t('{name} : {count}', { name: item.name, count: item.countLabel })}
      className="fd-fixe group relative block h-[150px] rounded-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-4 focus-visible:ring-offset-paper sm:h-[168px]">
      {/* Dos du dossier et son onglet */}
      <span aria-hidden className="absolute start-0 top-0 h-6 w-[42%] rounded-t-[10px] bg-[#d9a94c]" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 top-[18px] rounded-[14px] rounded-ss-none bg-[#d9a94c]" />
      {/* Feuilles qui dépassent */}
      <span aria-hidden className="absolute start-[9%] end-[12%] top-[26px] h-[58%] -rotate-[2.5deg] rounded-md bg-white shadow-[0_1px_3px_rgba(60,40,0,.12)] transition-transform duration-300 ease-out group-hover:-translate-y-3 group-hover:-rotate-[4deg] motion-reduce:transform-none">
        <span className="absolute start-3 end-6 top-3 h-[3px] rounded bg-[#ece7dd]" />
        <span className="absolute start-3 end-10 top-[18px] h-[3px] rounded bg-[#ece7dd]" />
      </span>
      <span aria-hidden className="absolute start-[14%] end-[7%] top-[22px] h-[58%] rotate-[1.5deg] rounded-md bg-[#fdfcfa] shadow-[0_1px_3px_rgba(60,40,0,.12)] transition-transform delay-75 duration-300 ease-out group-hover:-translate-y-2 group-hover:rotate-[3deg] motion-reduce:transform-none" />
      {/* Face avant : nom, nombre de contenus, avancement */}
      <span className="absolute inset-x-0 bottom-0 flex min-h-[60%] origin-bottom flex-col justify-end rounded-[14px] p-3.5 shadow-[0_10px_22px_-12px_rgba(120,80,10,.55)] transition-transform duration-300 ease-out [transform:perspective(800px)_rotateX(0deg)] group-hover:[transform:perspective(800px)_rotateX(-16deg)] motion-reduce:transform-none sm:p-4"
        style={{ background: 'linear-gradient(180deg, #f7dc9e 0%, #eec574 100%)' }}>
        <span aria-hidden className="absolute inset-x-0 top-0 h-px rounded-t-[14px] bg-white/60" />
        {item.badge && (
          <span className="absolute end-2.5 top-2.5 rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold text-[#7a5a14] shadow-sm">{item.badge}</span>
        )}
        <span className="shrink-0 text-[14px] font-semibold leading-snug text-[#3a2a07] line-clamp-2 sm:text-[15px]">{item.name}</span>
        <span className="fd-nums mt-0.5 truncate text-[12px] text-[#6f5419]">
          {item.countLabel}
          {item.sub && <> · {item.sub}</>}
          {p && done > 0 && <> · {done} {t((item.doneWord ?? ['fait', 'faits'])[done > 1 ? 1 : 0])}</>}
        </span>
        {aussi && <span className="truncate text-[11px] text-[#7a5f22]">{aussi}</span>}
        {/* Avancement : réussis (vert) et à revoir (brun doré) */}
        {p && done > 0 && (
          <span aria-hidden className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/55">
            <span className="h-full bg-brand" style={{ width: `${(success / item.count) * 100}%` }} />
            <span className="h-full bg-[#9a6e1c]" style={{ width: `${((done - success) / item.count) * 100}%` }} />
          </span>
        )}
      </span>
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
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 xl:grid-cols-4">
              {g.items.map((item) => <li key={item.key}><FolderCard item={item} /></li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

/** Dossiers fantômes pendant le chargement. */
export const FolderSkeleton: React.FC<{ n?: number }> = ({ n = 8 }) => (
  <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 xl:grid-cols-4" role="status" aria-label={t('Chargement des dossiers')}>
    {Array.from({ length: n }, (_, i) => (
      <li key={i} className="relative h-[150px] animate-pulse sm:h-[168px]">
        <span className="absolute start-0 top-0 h-6 w-[42%] rounded-t-[10px] bg-[#efece6]" />
        <span className="absolute inset-x-0 bottom-0 top-[18px] rounded-[14px] rounded-ss-none bg-[#efece6]" />
        <span className="absolute inset-x-0 bottom-0 top-[40%] rounded-[14px] bg-[#f4f2ee]" />
      </li>
    ))}
  </ul>
);

export default FolderGrid;
