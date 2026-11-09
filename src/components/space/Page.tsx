/**
 * Briques communes de l'espace de l'élève (refonte du 11/10/2026) : une seule façon de faire une page,
 * un en-tête, une section, un état vide, des onglets. Identité « encre et papier » : fond papier, titres
 * titres en gras (fd-display), vert pour l'action, or pour les repères, beaucoup d'air.
 *
 *   <Page>
 *     <PageHeader eyebrow="Mon suivi" title="Réviser" subtitle="…" actions={…} />
 *     <Section title="À refaire" count={3} action={<Link …>Tout voir</Link>}>…</Section>
 *   </Page>
 */
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft } from 'lucide-react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { t } from '@/i18n';

type Width = 'narrow' | 'default' | 'wide' | 'full';
// full : listes de cartes (3 colonnes sur grand écran).
const WIDTH: Record<Width, string> = { narrow: 'max-w-3xl', default: 'max-w-5xl', wide: 'max-w-6xl', full: 'max-w-7xl' };

/** Fond papier, colonne centrée, marges régulières (téléphone : 16 px). */
export const Page: React.FC<{ width?: Width; children: React.ReactNode; className?: string }> = ({
  width = 'default', children, className = '',
}) => (
  <div className="min-h-screen bg-paper pb-20">
    <div className={`mx-auto w-full ${WIDTH[width]} px-4 pt-5 sm:pt-8 md:px-8 ${className}`}>{children}</div>
  </div>
);

/** En-tête de page : repère (or), titre serif, une phrase, actions à droite (dessous sur téléphone). */
export const PageHeader: React.FC<{
  eyebrow?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Lien de retour au-dessus du titre (« ‹ Réviser »). */
  back?: { to: string; label: string };
  children?: React.ReactNode;
}> = ({ eyebrow, icon: Icon, title, subtitle, actions, back, children }) => (
  <header className="mb-6 sm:mb-8">
    {back && (
      <Link to={back.to}
        className="mb-3 inline-flex min-h-10 items-center gap-1 rounded-lg pe-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> {t(back.label)}
      </Link>
    )}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </p>
        )}
        <h1 className="fd-display text-ink" style={{ fontSize: 'clamp(28px, 3.4vw, 38px)', lineHeight: 1.08 }}>{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-faint">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </header>
);

/** Section : titre serif, compteur, action à droite, puis le contenu. */
export const Section: React.FC<{
  id?: string;
  title: React.ReactNode;
  count?: number | null;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ id, title, count, hint, action, children, className = '' }) => {
  const headingId = id ? `${id}-titre` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`scroll-mt-24 ${className}`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="fd-display flex items-baseline gap-2 text-[20px] leading-tight text-ink">
            {title}
            {count != null && count > 0 && <span className="fd-nums font-sans text-[13px] font-semibold text-ink-faint">{count}</span>}
          </h2>
          {hint && <p className="mt-1 text-[13px] text-ink-faint">{hint}</p>}
        </div>
        {action && <div className="shrink-0 text-[13px]">{action}</div>}
      </div>
      {children}
    </section>
  );
};

/** Lien d'action discret d'une section (« Tout voir › »). */
export const SectionLink: React.FC<{ to: string; children: React.ReactNode; onClick?: () => void }> = ({ to, children, onClick }) => (
  <Link to={to} onClick={onClick} className="inline-flex min-h-10 items-center font-semibold text-brand-hover hover:underline">
    {children}
  </Link>
);

/** État vide illustré : cercles doux autour d'une icône, une phrase qui dit quoi faire, une action. */
export const EmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  text?: React.ReactNode;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
  tone?: 'brand' | 'gold' | 'ink';
  compact?: boolean;
}> = ({ icon: Icon, title, text, action, secondary, tone = 'brand', compact = false }) => {
  const toneCls = tone === 'gold' ? 'bg-gold-soft text-gold-strong ring-gold-line'
    : tone === 'ink' ? 'bg-[#f2f1ee] text-ink-soft ring-line' : 'bg-brand-soft text-brand-hover ring-brand-line';
  return (
    <div className={`fd-card flex flex-col items-center text-center ${compact ? 'px-5 py-7' : 'px-6 py-10 sm:py-12'}`}>
      <div className="relative mb-4" aria-hidden>
        <span className="absolute inset-0 -m-3 rounded-full bg-[#f7f6f3]" />
        <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${toneCls}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-faint">{text}</p>}
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}{secondary}</div>
      )}
    </div>
  );
};

/** Chiffre clé : libellé, valeur, précision. */
export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }> = ({
  label, value, hint, className = '',
}) => (
  <div className={`rounded-2xl border border-line bg-white px-4 py-3.5 ${className}`}>
    <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-faint">{t(label)}</p>
    <p className="fd-nums mt-1 text-[24px] font-bold leading-none text-ink">{value}</p>
    {hint && <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">{hint}</p>}
  </div>
);

/** Onglets en segments (deux à quatre vues d'une même page), avec compteur. */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; count?: number; icon?: React.ComponentType<{ className?: string }> }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={t(label)} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1 scrollbar-hide">
      {options.map((o) => {
        const active = o.key === value;
        const Icon = o.icon;
        return (
          <button key={o.key} type="button" role="tab" aria-selected={active} onClick={() => onChange(o.key)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13.5px] font-semibold transition-colors ${
              active ? 'bg-ink text-white' : 'text-ink-faint hover:bg-[#f7f6f3] hover:text-ink'}`}>
            {Icon && <Icon className="h-4 w-4" />}
            {t(o.label)}
            {o.count != null && (
              <span className={`fd-nums rounded-full px-1.5 text-[11.5px] ${active ? 'bg-white/15 text-white' : 'bg-[#f2f1ee] text-ink-faint'}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Onglets discrets d'une page (salons d'un forum, vues des membres) : du texte et un filet sous l'onglet actif. Plus
 * calmes que Segmented quand la page a d'autres repères forts. Sur téléphone, ils défilent jusqu'au bord de l'écran.
 */
export function UnderlineTabs<T extends string>({ value, onChange, options, label, className = '' }: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={t(label)}
      className={`-mx-4 flex gap-5 overflow-x-auto border-b border-line px-4 scrollbar-hide sm:gap-7 md:mx-0 md:px-0 ${className}`}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button key={o.key} type="button" role="tab" aria-selected={active} onClick={() => onChange(o.key)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-[14px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              active ? 'border-ink text-ink' : 'border-transparent text-ink-faint hover:text-ink-soft'}`}>
            {t(o.label)}
            {!!o.count && <span className="fd-nums rounded-full bg-gold-soft px-1.5 text-[12px] font-bold text-gold-strong">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Choix discret (tri, filtre d'une liste) : se lit comme du texte, le fond n'apparaît qu'au survol ; un clic ouvre le menu
 * sous le bouton. Pas de <select> natif : sa largeur est celle de sa plus longue option, un trou séparait le texte de la flèche.
 */
export function QuietMenu<T extends string>({ label, value, onChange, options, className = '' }: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div ref={anchor} className={`shrink-0 ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
        aria-label={`${t(label)} : ${current?.label ?? ''}`}
        className="inline-flex h-11 items-center gap-1 rounded-xl px-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <span className="max-w-[170px] truncate">{current?.label}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      <FloatingPanel anchorRef={anchor} open={open} onClose={() => setOpen(false)} placement="bottom-end" offset={6} role="menu"
        className="max-h-[320px] min-w-[190px] overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_14px_40px_rgba(20,18,16,.16)]">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button key={o.value} type="button" role="menuitemradio" aria-checked={selected}
              onClick={() => { setOpen(false); if (!selected) onChange(o.value); }}
              className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-xl px-3 text-start text-[14px] transition-colors hover:bg-[#f7f6f3] focus:outline-none focus-visible:bg-[#f7f6f3] ${
                selected ? 'font-semibold text-ink' : 'font-medium text-ink-soft'}`}>
              {o.label}
              {selected && <Check aria-hidden className="h-4 w-4 shrink-0 text-brand-hover" />}
            </button>
          );
        })}
      </FloatingPanel>
    </div>
  );
}

/** Barre réussis (vert) · à revoir (or) · reste ; la même chose en mots pour les lecteurs d'écran. */
export const SplitBar: React.FC<{ success: number; review: number; total: number; className?: string }> = ({
  success, review, total, className = '',
}) => {
  const tot = Math.max(total, 1);
  const s = Math.min(success, tot);
  const r = Math.min(review, tot - s);
  return (
    <span className={`flex h-1.5 overflow-hidden rounded-full bg-[#f2f1ee] ${className}`}
      role="img" aria-label={s > 1 ? t('{s} réussis, {r} à revoir, sur {total}', { s, r, total }) : t('{s} réussi, {r} à revoir, sur {total}', { s, r, total })}>
      <span className="h-full bg-brand" style={{ width: `${(s / tot) * 100}%` }} />
      <span className="h-full bg-gold" style={{ width: `${(r / tot) * 100}%` }} />
    </span>
  );
};

/** Carte cliquable standard (lien) : bordure, survol, focus visible. */
export const CardLink: React.FC<{ to: string; children: React.ReactNode; className?: string; onClick?: () => void; state?: unknown }> = ({
  to, children, className = '', onClick, state,
}) => (
  <Link to={to} onClick={onClick} state={state}
    className={`group block rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}>
    {children}
  </Link>
);

/** Squelette d'une liste de cartes. */
export const CardsSkeleton: React.FC<{ n?: number; className?: string }> = ({ n = 3, className = '' }) => (
  <div className={`grid gap-3 ${className}`} role="status" aria-label={t('Chargement')}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="animate-pulse rounded-2xl border border-line bg-white p-4">
        <div className="h-4 w-2/3 rounded bg-[#efece6]" />
        <div className="mt-2.5 h-3 w-1/3 rounded bg-[#f2f1ee]" />
      </div>
    ))}
  </div>
);
