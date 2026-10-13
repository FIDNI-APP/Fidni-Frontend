/**
 * Pilotage › Aperçu — la grande courbe du chiffre choisi, une barre par jour (12/10/2026) : graduations,
 * moyenne de la période en pointillé, valeur du jour au survol, au clavier et au toucher.
 * Jours sans mesure (vues avant le 5 octobre) : hachurés.
 */
import React, { useState } from 'react';

export interface DayPoint { date: string; value: number | null }

const fmt = (n: number) => n.toLocaleString('fr-FR');
const fmt1 = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const plural = (n: number, [one, many]: [string, string]) => `${fmt(n)} ${n > 1 ? many : one}`;
const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', opts);

/** Graduation « ronde » (1, 2, 5 × 10ⁿ) avec 4 intervalles au plus ; des nombres entiers (ce sont des comptes). */
function ticks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag);
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

interface DayChartProps {
  series: DayPoint[];
  color: string;
  unit: [string, string];
  /** Total de la période, affiché quand rien n'est survolé. */
  headline: string;
  hint: string;
  /** Début de la mesure jour par jour, cité si des jours sont hachurés. */
  measuredSince?: string;
}

export const DayChart: React.FC<DayChartProps> = ({ series, color, unit, headline, hint, measuredSince }) => {
  const [hover, setHover] = useState<number | null>(null);
  const known = series.map((d) => d.value).filter((v): v is number => v !== null);
  const scale = ticks(Math.max(0, ...known));
  const top = scale[scale.length - 1] || 1;
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  const shown = hover !== null ? series[hover] : null;
  const hasGap = series.some((d) => d.value === null);
  const mid = series.length > 2 ? series[Math.floor((series.length - 1) / 2)] : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[12.5px] text-ink-faint">
            {shown ? dayLabel(shown.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sur la période'}
          </p>
          <p className="fd-nums mt-0.5 text-[20px] font-bold leading-tight text-ink">
            {shown ? (shown.value === null ? 'pas encore mesuré' : plural(shown.value, unit)) : headline}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-faint">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden /> par jour</span>
          {avg > 0 && (
            <span className="fd-nums inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed" style={{ borderColor: color }} aria-hidden /> moyenne : {fmt1(avg)} / jour
            </span>
          )}
        </div>
      </div>

      {/* Hauteur : 176 px au moins, davantage si la carte voisine (Membres) est plus haute. */}
      <div className="relative min-h-[176px] flex-1">
        {/* Graduations : lignes fines, chiffres à gauche. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {scale.map((t) => (
            <div key={t} className="absolute left-0 right-0 h-0" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="fd-nums absolute left-0 top-0 w-7 -translate-y-1/2 pr-1.5 text-right text-[10.5px] leading-none text-ink-faint">{fmt(t)}</span>
              <span className={`absolute left-8 right-0 top-0 border-t ${t === 0 ? 'border-[#e7e3dc]' : 'border-[#f2f1ee]'}`} />
            </div>
          ))}
          {avg > 0 && (
            <div className="absolute left-8 right-0 border-t-2 border-dashed opacity-60" style={{ bottom: `${(avg / top) * 100}%`, borderColor: color }} />
          )}
        </div>

        <div className={`absolute inset-y-0 left-8 right-0 flex items-end ${series.length > 40 ? 'gap-px' : 'gap-[3px]'}`} onMouseLeave={() => setHover(null)}>
          {series.map((d, i) => {
            const v = d.value;
            const on = hover === i;
            return (
              <button key={d.date} type="button" aria-label={`${dayLabel(d.date)} : ${v === null ? 'pas encore mesuré' : plural(v, unit)}`}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => setHover(i)}
                className={`flex h-full min-w-0 flex-1 items-end rounded-[4px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${on ? 'bg-ink/[.04]' : ''}`}>
                {v === null ? (
                  <span className="block h-full w-full rounded-t-[3px]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #ebe8e2 0 3px, transparent 3px 6px)' }} />
                ) : (
                  <span className="block w-full rounded-t-[4px] transition-[opacity,height] duration-300" style={{
                    height: v ? `${Math.max(2, (v / top) * 100)}%` : '2px',
                    background: v ? color : '#e7e3dc',
                    opacity: hover === null || on ? 1 : 0.35,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-8 text-[11px] text-ink-faint">
        <span>{series[0] ? dayLabel(series[0].date) : ''}</span>
        {mid && <span className="hidden sm:inline">{dayLabel(mid.date)}</span>}
        <span>aujourd’hui</span>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
        {hint}
        {hasGap && measuredSince && <> Comptées jour par jour depuis le {dayLabel(measuredSince, { day: 'numeric', month: 'long' })} (zone hachurée : avant).</>}
      </p>
    </div>
  );
};

export default DayChart;
