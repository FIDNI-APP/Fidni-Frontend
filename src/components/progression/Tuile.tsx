/**
 * Tuile d'un chiffre du tableau de bord « Ma progression » (13/10/2026) : même allure que les tuiles de Pilotage
 * (components/pilotage/KpiTile), cliquable pour choisir le grand graphique. Écart avec la période d'avant : en hausse
 * en vert, en baisse en or (comme ailleurs pour l'élève : pas de rouge).
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkline, type SparklineProps } from '@/components/pilotage/Sparkline';

export const Ecart: React.FC<{ texte: string | null; sens: -1 | 0 | 1; jours: number | null }> = ({ texte, sens, jours }) => {
  if (texte === null) return null;
  const tone = sens === 0 ? 'text-ink-faint' : sens > 0 ? 'text-brand' : 'text-gold-strong';
  return (
    <span className="fd-nums flex flex-wrap items-baseline gap-x-1 text-[12px] leading-snug">
      <span className={`font-semibold ${tone}`}>{texte}</span>
      <span className="text-ink-faint">{jours ? `vs ${jours} j d’avant` : 'vs avant'}</span>
    </span>
  );
};

export const Tuile: React.FC<{
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  unit?: string;
  ecart?: { texte: string | null; sens: -1 | 0 | 1 };
  jours?: number | null;
  sub?: React.ReactNode;
  spark?: SparklineProps;
  footer?: React.ReactNode;
  accent: string;
  selected: boolean;
  onClick: () => void;
  tour?: string;
}> = ({ icon: Icon, label, value, unit, ecart: e, jours = null, sub, spark, footer, accent, selected, onClick, tour }) => (
  <button type="button" onClick={onClick} aria-pressed={selected} data-tour={tour}
    className={`group relative flex h-full w-full min-w-0 flex-col rounded-2xl border bg-white p-4 text-left transition-[border-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
      selected ? 'border-ink shadow-[0_0_0_1px_#1a1a1a]' : 'border-line hover:border-[#d8d4cc] hover:shadow-card-hover'}`}>
    <span className="flex items-start gap-1.5 text-[12.5px] font-medium leading-tight text-ink-soft">
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden />
      <span className="min-w-0 flex-1">{label}</span>
    </span>
    <span className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-[26px] font-bold leading-none tracking-tight text-ink sm:text-[30px]">{value}</span>
      {unit && <span className="text-[12.5px] font-medium text-ink-faint">{unit}</span>}
    </span>
    {e && <span className="mt-1.5"><Ecart {...e} jours={jours} /></span>}
    {sub && <span className="mt-1 block text-[12px] leading-snug text-ink-faint">{sub}</span>}
    <span className="mt-auto block pt-3">
      {spark ? <Sparkline {...spark} /> : <span className="flex h-9 items-end">{footer}</span>}
    </span>
  </button>
);

export default Tuile;
