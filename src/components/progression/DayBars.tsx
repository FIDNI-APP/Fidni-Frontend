/**
 * Barres jour par jour (ou semaine par semaine) du tableau de bord « Ma progression » (13/10/2026), dans l'esprit du
 * grand graphique de Pilotage : graduations fines, une barre par jour (empilée s'il y a plusieurs séries, 2 px d'air
 * entre les morceaux), valeur du jour au survol, au clavier et au toucher, au-dessus du graphique (pas d'infobulle
 * qui cacherait les barres). `onPick` : un clic ouvre le détail du jour.
 */
import React, { useState } from 'react';
import { niceTicks, parseDay } from '@/pages/progression/format';

export interface BarSerie { key: string; label: string; color: string }
export type BarRow = { date: string; [cle: string]: string | number };

const label = (iso: string, pas: 'jour' | 'semaine', long = false) => {
  const d = parseDay(iso);
  if (pas === 'semaine') return `semaine du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  return d.toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' });
};

export const DayBars: React.FC<{
  rows: BarRow[];
  series: readonly BarSerie[];
  pas: 'jour' | 'semaine';
  /** Résumé d'une barre : « 3 réussies · 1 à revoir ». */
  describe: (row: BarRow) => string;
  /** Ce qu'on lit quand rien n'est survolé (total de la période). */
  headline: React.ReactNode;
  tick?: (v: number) => string;
  selected?: string | null;
  onPick?: (date: string) => void;
  emptyText?: string;
  height?: number;
}> = ({ rows, series, pas, describe, headline, tick = (v) => String(v), selected = null, onPick, emptyText, height = 190 }) => {
  const [hover, setHover] = useState<number | null>(null);
  const total = (r: BarRow) => series.reduce((s, x) => s + Number(r[x.key] || 0), 0);
  const max = Math.max(0, ...rows.map(total));
  const scale = niceTicks(max);
  const top = scale[scale.length - 1] || 1;
  const shown = hover !== null ? rows[hover] : null;
  const mid = rows.length > 2 ? rows[Math.floor((rows.length - 1) / 2)] : null;
  const empty = max === 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0" aria-live="polite">
          <p className="text-[12.5px] text-ink-faint">{shown ? label(shown.date, pas, true) : 'Sur la période'}</p>
          <p className="fd-nums mt-0.5 text-[18px] font-bold leading-tight text-ink sm:text-[20px]">{shown ? describe(shown) : headline}</p>
        </div>
        {series.length > 1 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-soft" aria-label="Légende">
            {series.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden /> {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative" style={{ height }}>
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {scale.map((t) => (
            <div key={t} className="absolute left-0 right-0 h-0" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="fd-nums absolute left-0 top-0 w-9 -translate-y-1/2 pr-1.5 text-right text-[10.5px] leading-none text-ink-faint">{tick(t)}</span>
              <span className={`absolute left-10 right-0 top-0 border-t ${t === 0 ? 'border-[#e7e3dc]' : 'border-[#f2f1ee]'}`} />
            </div>
          ))}
        </div>
        {empty && emptyText && (
          <p className="absolute inset-x-10 top-1/2 -translate-y-1/2 text-center text-[13px] text-ink-faint">{emptyText}</p>
        )}
        <div className={`absolute inset-y-0 left-10 right-0 flex items-end ${rows.length > 45 ? 'gap-px' : 'gap-[3px]'}`}
          onMouseLeave={() => setHover(null)}>
          {rows.map((r, i) => {
            const on = hover === i || selected === r.date;
            const t = total(r);
            const parts = series.filter((s) => Number(r[s.key] || 0) > 0);
            return (
              <button key={r.date} type="button" aria-label={`${label(r.date, pas, true)} : ${describe(r)}`}
                aria-pressed={onPick ? selected === r.date : undefined}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => { setHover(i); if (onPick && t > 0) onPick(r.date); }}
                className={`flex h-full min-w-0 flex-1 items-end justify-center rounded-[4px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  on ? 'bg-ink/[.05]' : ''} ${onPick && t > 0 ? 'cursor-pointer' : 'cursor-default'}`}>
                <span className="flex w-full max-w-[24px] flex-col-reverse gap-[2px] transition-opacity duration-200"
                  style={{ height: t ? `${Math.max(2, (t / top) * 100)}%` : '2px', opacity: hover === null || on ? 1 : 0.4 }}>
                  {t === 0 ? <span className="block h-[2px] w-full rounded-full bg-[#e7e3dc]" /> : parts.map((s, k) => (
                    <span key={s.key} className={`block w-full ${k === parts.length - 1 ? 'rounded-t-[4px]' : ''}`}
                      style={{ flexGrow: Number(r[s.key]), flexBasis: 0, minHeight: 2, background: s.color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-10 text-[11px] text-ink-faint">
        <span>{rows[0] ? label(rows[0].date, 'jour') : ''}</span>
        {mid && <span className="hidden sm:inline">{label(mid.date, 'jour')}</span>}
        <span>{pas === 'semaine' ? 'cette semaine' : 'aujourd’hui'}</span>
      </div>
    </div>
  );
};

export default DayBars;
