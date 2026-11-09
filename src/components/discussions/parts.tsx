// Briques communes au forum, à l'onglet « Commentaires » d'un contenu et à la cloche (08/11/2026). Identité du site :
// papier, encre, or pour les repères, vert pour l'action.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowBigUp, BookOpen, Compass, GraduationCap, Lightbulb, LifeBuoy, X } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { DifficultyChip, ProgressPill } from '@/components/content/listing/ListingParts';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { toggleUtile, type ContentTag, type DiscussionAuthor, type Salon } from '@/lib/api/discussionsApi';
import { t, dateLocale } from '@/i18n';

type Icon = React.ComponentType<{ className?: string }>;

/**
 * Les quatre salons : nom, icône, teinte de la pastille, point de couleur (lignes du forum), couleur de leur bloc
 * (texte blanc, contraste d'au moins 4,5:1 : SalonBlocs).
 */
export const SALONS: { key: Salon; label: string; icon: Icon; tone: string; dot: string; bloc: string }[] = [
  { key: 'entraide', label: 'Entraide', icon: LifeBuoy, tone: 'bg-brand-soft text-brand-hover', dot: '#2f9a68', bloc: '#1a7a4a' },
  { key: 'methodes', label: 'Méthodes', icon: Lightbulb, tone: 'bg-gold-soft text-gold-strong', dot: '#d09a3e', bloc: '#9a6e1c' },
  { key: 'bac', label: 'Bac & concours', icon: GraduationCap, tone: 'bg-[#eef1f8] text-[#3b4f7a]', dot: '#5b7fb8', bloc: '#3f5f96' },
  { key: 'orientation', label: 'Orientation', icon: Compass, tone: 'bg-[#f6eef2] text-[#7a3b5c]', dot: '#b0668c', bloc: '#8f4f72' },
];
export const salonOf = (key: Salon) => SALONS.find((s) => s.key === key) ?? SALONS[0];

export const SalonChip: React.FC<{ salon: Salon; to?: string }> = ({ salon, to }) => {
  const s = salonOf(salon);
  const Ico = s.icon;
  const cls = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${s.tone}`;
  const inner = <><Ico className="h-3 w-3" aria-hidden />{t(s.label)}</>;
  return to ? <Link to={to} className={`${cls} hover:opacity-80`}>{inner}</Link> : <span className={cls}>{inner}</span>;
};

export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('à l’instant');
  if (s < 3600) return t('il y a {n} min', { n: Math.floor(s / 60) });
  if (s < 86400) return t('il y a {n} h', { n: Math.floor(s / 3600) });
  const d = Math.floor(s / 86400);
  if (d === 1) return t('hier');
  if (d < 30) return t('il y a {n} j', { n: d });
  return new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
};
export const fullDate = (iso: string) => new Date(iso).toLocaleString(dateLocale(), { dateStyle: 'long', timeStyle: 'short' });

export const Avatar: React.FC<{ user: { username: string; avatar: string | null }; size?: number; ring?: boolean }> = ({
  user, size = 36, ring = false,
}) => {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  const ringCls = ring ? 'ring-2 ring-white' : '';
  return user.avatar && !broken
    ? <img src={user.avatar} alt="" onError={() => setBroken(true)} style={style} className={`shrink-0 rounded-full object-cover ${ringCls}`} />
    : (
      <span aria-hidden style={style}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] font-bold uppercase text-ink-soft ${ringCls}`}>
        {user.username?.[0] ?? '?'}
      </span>
    );
};

/** Repère public de l'auteur : son niveau (élève), « Professeur », « Équipe Fidni ». */
export const RoleBadge: React.FC<{ author: DiscussionAuthor }> = ({ author }) => {
  if (author.role === 'equipe') {
    return <span className="rounded-full bg-ink px-1.5 py-px text-[10.5px] font-bold uppercase tracking-[.04em] text-white">{t('Équipe Fidni')}</span>;
  }
  if (author.role === 'prof') {
    return <span className="rounded-full bg-gold-soft px-1.5 py-px text-[10.5px] font-bold uppercase tracking-[.04em] text-gold-strong">{t('Professeur')}</span>;
  }
  return author.level ? <span className="text-[12px] text-ink-faint">{author.level}</span> : null;
};

export const AuthorName: React.FC<{ author: DiscussionAuthor; className?: string }> = ({ author, className = '' }) => (
  author.is_deleted
    ? <span className={`italic text-ink-faint ${className}`}>{t('Compte supprimé')}</span>
    : <Link to={`/profile/${author.username}`} className={`font-semibold text-ink hover:underline ${className}`}>{author.username}</Link>
);

const TYPE: Record<ContentTag['type'], { label: string; icon: Icon; tone: string }> = {
  exercise: { label: 'Exercice', icon: BookOpen, tone: 'bg-brand-soft text-brand-hover' },
  exam: { label: 'Examen', icon: APlusIcon, tone: 'bg-[#eef1f8] text-[#3b4f7a]' },
  lesson: { label: 'Leçon', icon: LessonIcon, tone: 'bg-gold-soft text-gold-strong' },
};
export const contentTypeLabel = (type: ContentTag['type']) => t(TYPE[type].label);
export const contentTypeIcon = (type: ContentTag['type']) => TYPE[type].icon;

/**
 * Carte d'un contenu tagué : type, titre, chapitre, niveau, difficulté, et où en est l'élève connecté. Un clic ouvre
 * le contenu ; `onRemove` (formulaire) : une croix à la place du lien.
 */
export const ContentTagCard: React.FC<{ tag: ContentTag; compact?: boolean; onRemove?: () => void }> = ({ tag, compact = false, onRemove }) => {
  const type = TYPE[tag.type];
  const Ico = type.icon;
  const body = (
    <>
      <span className={`flex shrink-0 items-center justify-center rounded-lg ${type.tone} ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
        <Ico className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10.5px] font-bold uppercase tracking-[.08em] text-ink-faint">
          {t(type.label)}{tag.chapter ? ` · ${tag.chapter}` : ''}
        </span>
        <span className={`block truncate font-semibold text-ink ${compact ? 'text-[13px]' : 'text-[14px]'}`}>{tag.title}</span>
        {!compact && (tag.level || tag.difficulty || tag.status) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-faint">
            {tag.level && <span>{tag.level}</span>}
            {tag.difficulty && <DifficultyChip difficulty={tag.difficulty} plain />}
            {tag.status && <ProgressPill progress={tag.status} />}
          </span>
        )}
      </span>
      {compact && tag.status && <ProgressPill progress={tag.status} />}
    </>
  );
  const cls = `flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-white ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`;
  if (onRemove) {
    return (
      <div className={cls}>
        {body}
        <button type="button" onClick={onRemove} aria-label={t('Retirer {nom}', { nom: tag.title })}
          className="-me-1 rounded-lg p-1.5 text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return <Link to={tag.url} className={`${cls} transition-colors hover:border-ink`}>{body}</Link>;
};

/**
 * « Utile » : un vote par membre, retiré au second clic, jamais sur ses propres messages. `vertical` : la colonne des
 * cartes de liste ; sinon un bouton dans la barre d'actions.
 */
export const UtileButton: React.FC<{
  kind: 'discussion' | 'reponse'; id: number; count: number; active: boolean; own: boolean; vertical?: boolean;
  onChange?: (count: number, active: boolean) => void;
}> = ({ kind, id, count, active, own, vertical = false, onChange }) => {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [state, setState] = useState({ count, active });
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { setState({ count, active }); }, [count, active]);
  const click = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { openModal('vote'); return; }
    if (own || busy) return;
    setBusy(true);
    const before = state;
    setState({ count: state.count + (state.active ? -1 : 1), active: !state.active });
    try {
      const r = await toggleUtile(kind, id);
      setState({ count: r.utile, active: r.user_utile });
      onChange?.(r.utile, r.user_utile);
    } catch {
      setState(before);
    } finally {
      setBusy(false);
    }
  };
  const label = own ? t('{n} « utile »', { n: state.count }) : state.active ? t('Retirer « utile »') : t('Marquer comme utile');
  if (vertical) {
    return (
      <button type="button" onClick={click} aria-pressed={state.active} title={label} aria-label={label} disabled={own}
        className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 text-[13px] font-bold fd-nums transition-colors disabled:cursor-default ${
          state.active ? 'bg-brand-soft text-brand-hover' : 'text-ink-faint hover:bg-[#f2f1ee] hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-faint'}`}>
        <ArrowBigUp className={`h-5 w-5 ${state.active ? 'fill-current' : ''}`} aria-hidden />
        {state.count}
      </button>
    );
  }
  return (
    <button type="button" onClick={click} aria-pressed={state.active} title={label} aria-label={label} disabled={own}
      className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12.5px] font-semibold transition-colors disabled:cursor-default ${
        state.active ? 'bg-brand-soft text-brand-hover' : 'text-ink-faint hover:bg-[#f2f1ee] hover:text-ink disabled:hover:bg-transparent'}`}>
      <ArrowBigUp className={`h-4 w-4 ${state.active ? 'fill-current' : ''}`} aria-hidden />
      <span>{t('Utile')}</span>{state.count > 0 && <span className="fd-nums">{state.count}</span>}
    </button>
  );
};
