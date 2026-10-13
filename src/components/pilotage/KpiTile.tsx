/**
 * Pilotage — tuile d'un chiffre (12/10/2026) : icône et libellé, grand nombre et son unité, écart avec la
 * période d'avant, une ligne de détail, et en bas une petite courbe (ou un autre pied : barre, lien…).
 * Cliquable : bouton à bascule (`mode="toggle"`, choisit la courbe affichée) ou lien vers un onglet.
 */
import React from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Sparkline, type SparklineProps } from './Sparkline';

export interface KpiDelta {
  now: number;
  before: number | null;
  /** Longueur de la période comparée, pour « vs 30 j d’avant ». */
  days?: number;
}

type Tone = 'neutral' | 'alert' | 'warn';

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: number | null;
  unit?: string;
  format?: (n: number) => string;
  delta?: KpiDelta;
  sub?: React.ReactNode;
  spark?: SparklineProps;
  /** Remplace la courbe quand le chiffre n'a pas de série (barre, lien…). Même hauteur que la courbe. */
  footer?: React.ReactNode;
  onClick?: () => void;
  /** toggle : choisit ce chiffre (aria-pressed) ; link : ouvre un autre onglet. */
  mode?: 'toggle' | 'link';
  selected?: boolean;
  tone?: Tone;
  /** Couleur de l'icône (celle de la série). */
  accent?: string;
  hint?: string;
}

const fmt = (n: number) => n.toLocaleString('fr-FR');
const TONE: Record<Tone, string> = { neutral: 'text-ink', alert: 'text-[#a23b34]', warn: 'text-gold-strong' };

/** Écart avec la période d'avant : ↑ vert, ↓ rouge, « = » si égal, rien si la période d'avant est inconnue. */
export const DeltaLine: React.FC<KpiDelta & { className?: string }> = ({ now, before, days, className = '' }) => {
  if (before === null) return null;
  const diff = now - before;
  const pct = before ? Math.round((diff / before) * 100) : null;
  const text = diff === 0 ? '='
    : pct === null || pct === 0 ? `${diff > 0 ? '↑ +' : '↓ −'}${fmt(Math.abs(diff))}`
      : `${pct > 0 ? '↑' : '↓'} ${fmt(Math.abs(pct))} %`;
  const tone = diff === 0 ? 'text-ink-faint' : diff > 0 ? 'text-brand' : 'text-[#a23b34]';
  return (
    <span className={`fd-nums flex flex-wrap items-baseline gap-x-1 text-[12px] leading-snug ${className}`}
      title={`${fmt(now)} contre ${fmt(before)}${days ? ` sur les ${days} jours d’avant` : ' avant'}`}>
      <span className={`font-semibold ${tone}`}>{text}</span>
      <span className="text-ink-faint">{days ? `vs ${days} j d’avant` : 'vs avant'}</span>
    </span>
  );
};

export const KpiTile: React.FC<KpiTileProps> = ({
  icon: Icon, label, value, unit, format = fmt, delta, sub, spark, footer, onClick, mode = 'toggle', selected = false,
  tone = 'neutral', accent, hint,
}) => {
  const body = (
    <>
      <span className="flex items-start gap-1.5 text-[12.5px] font-medium leading-tight text-ink-soft">
        <Icon className="mt-px h-3.5 w-3.5 shrink-0" style={{ color: accent ?? '#6b6862' }} aria-hidden />
        <span className="min-w-0 flex-1">{label}</span>
        {onClick && mode === 'link' && (
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink" aria-hidden />
        )}
      </span>
      <span className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5">
        <span className={`fd-nums text-[26px] font-bold leading-none tracking-tight sm:text-[30px] ${TONE[tone]}`}>
          {value === null ? '—' : format(value)}
        </span>
        {unit && value !== null && <span className="text-[12.5px] font-medium text-ink-faint">{unit}</span>}
      </span>
      {delta && <DeltaLine {...delta} className="mt-1.5" />}
      {sub && <span className="mt-1 block text-[12px] leading-snug text-ink-faint">{sub}</span>}
      <span className="mt-auto block pt-3">
        {spark ? <Sparkline {...spark} /> : <span className="flex h-9 items-end">{footer}</span>}
      </span>
    </>
  );
  const frame = `group relative flex h-full w-full min-w-0 flex-col rounded-2xl border bg-white p-4 text-left transition-[border-color,box-shadow] ${
    selected ? 'border-ink shadow-[0_0_0_1px_#1a1a1a]' : 'border-line'}`;
  if (!onClick) return <div className={frame} title={hint}>{body}</div>;
  return (
    <button type="button" onClick={onClick} title={hint} aria-pressed={mode === 'toggle' ? selected : undefined}
      className={`${frame} ${selected ? '' : 'hover:border-[#d8d4cc] hover:shadow-card-hover'} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40`}>
      {body}
    </button>
  );
};

export default KpiTile;
