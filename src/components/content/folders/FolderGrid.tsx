/**
 * Dossiers des listes (10/10/2026) : Maths › niveau › chapitre, comme des dossiers qui contiennent les
 * contenus. Un dossier avec des contenus est un lien ; un dossier vide est grisé, dit « Vide pour
 * l'instant » et ne se clique pas. Utilisé par pages/content/ContentFolders.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Folder } from 'lucide-react';
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

const FolderCard: React.FC<{ item: FolderItem }> = ({ item }) => {
  const empty = item.count <= 0;
  const done = Math.min(item.progress?.done ?? 0, item.count);
  const success = Math.min(item.progress?.success ?? 0, done);
  const body = (
    <>
      <Folder aria-hidden className={empty ? 'mt-0.5 h-5 w-5 shrink-0 text-ink-faint' : 'mt-0.5 h-5 w-5 shrink-0 text-gold-strong'} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{item.name}</span>
        <span className="fd-nums mt-1 block text-[12.5px] text-ink-soft">
          {empty ? t(item.emptyLabel ?? 'Vide pour l’instant') : item.countLabel}
          {item.sub && <> · {item.sub}</>}
          {done > 0 && <> · {done} {t((item.doneWord ?? ['fait', 'faits'])[done > 1 ? 1 : 0])}</>}
        </span>
        {!!item.aussi?.length && <span className="mt-0.5 block text-xs text-ink-soft">{t('Aussi : {list}', { list: item.aussi.join(', ') })}</span>}
        {item.badge && <span className="mt-1 block text-xs font-semibold text-brand-hover">{item.badge}</span>}
        {done > 0 && (
          <span aria-hidden className="mt-2 flex h-1 max-w-32 overflow-hidden rounded-full bg-paper">
            <span className="bg-brand" style={{ width: String(success / item.count * 100) + '%' }} />
            <span className="bg-gold" style={{ width: String((done - success) / item.count * 100) + '%' }} />
          </span>
        )}
      </span>
      {!empty && <ChevronRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-ink-faint group-hover:text-brand-hover rtl:rotate-180" />}
    </>
  );
  const layout = 'flex h-full min-h-16 items-start gap-3 rounded-xl border px-3.5 py-3';
  if (empty) return <div aria-disabled="true" className={layout + ' border-dashed border-line text-ink-faint'}>{body}</div>;
  return (
    <Link to={item.to} onClick={item.onOpen}
      aria-label={done > 0 ? t(success > 1 ? '{name} : {count}, {s} réussis, {r} à revoir' : '{name} : {count}, {s} réussi, {r} à revoir',
        { name: item.name, count: item.countLabel, s: success, r: done - success }) : undefined}
      className={layout + ' group border-line bg-white text-ink transition-colors hover:border-brand-line hover:text-brand-hover focus-visible:outline-brand'}>
      {body}
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
              <h2 id={headingId} className="mb-3 flex items-baseline gap-2 text-[15px] font-semibold text-ink">
                {g.title}
                <span className="fd-nums text-[13px] font-normal text-ink-faint">{filled}/{g.items.length}</span>
              </h2>
            )}
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
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
  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3" role="status" aria-label={t('Chargement des dossiers')}>
    {Array.from({ length: n }, (_, i) => (
      <li key={i} className="min-h-16 animate-pulse rounded-xl border border-line bg-white px-4 py-3 motion-reduce:animate-none">
        <span className="block h-3 w-2/3 rounded bg-line" />
        <span className="mt-2 block h-2 w-1/3 rounded bg-line" />
      </li>
    ))}
  </ul>
);

export default FolderGrid;
