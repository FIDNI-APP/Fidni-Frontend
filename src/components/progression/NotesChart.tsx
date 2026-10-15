/**
 * Notes aux examens dans le temps (13/10/2026) : un point par examen noté (/20, d'après les auto-évaluations), reliés
 * dans l'ordre ; graduations 0 · 5 · 10 · 15 · 20, la moyenne de 10 un peu plus marquée. Survol, clavier, toucher :
 * l'examen, sa note et sa date au-dessus du graphique ; un clic ouvre l'examen.
 * Ligne en SVG étiré (trait non déformé), points en HTML posés par-dessus (un cercle SVG serait étiré).
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { decimal, parseDay } from '@/pages/progression/format';
import { COULEUR } from './chart';
import { t, dateLocale } from '@/i18n';

export interface NotePoint { date: string; note: number; titre: string; url?: string }

const GRADS = [0, 5, 10, 15, 20];
const court = (iso: string) => parseDay(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
const long = (iso: string) => parseDay(iso).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

export const NotesChart: React.FC<{
  points: NotePoint[];
  debut: string;
  fin: string;
  headline: React.ReactNode;
  emptyText: React.ReactNode;
  height?: number;
}> = ({ points, debut, fin, headline, emptyText, height = 190 }) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState<number | null>(null);
  const t0 = parseDay(debut).getTime();
  const span = Math.max(1, parseDay(fin).getTime() - t0);
  // Marge de 3 % de chaque côté : les points du premier et du dernier jour restent entiers.
  const x = (iso: string) => 3 + ((parseDay(iso).getTime() - t0) / span) * 94;
  const y = (n: number) => (n / 20) * 100;
  const shown = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="mb-4 min-w-0" aria-live="polite">
        <p className="truncate text-[12.5px] text-ink-faint">{shown ? `${long(shown.date)} · ${shown.titre}` : t('Sur la période')}</p>
        <p className="fd-nums mt-0.5 text-[18px] font-bold leading-tight text-ink sm:text-[20px]">
          {shown ? <>{decimal(shown.note)} <span className="text-[14px] font-semibold text-ink-faint">/ 20</span></> : headline}
        </p>
      </div>
      <div className="relative fd-ltr" style={{ height }}>
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {GRADS.map((g) => (
            <div key={g} className="absolute start-0 end-0 h-0" style={{ bottom: `${y(g)}%` }}>
              <span className="fd-nums absolute start-0 top-0 w-9 -translate-y-1/2 pe-1.5 text-end text-[10.5px] leading-none text-ink-faint">{g}</span>
              <span className={`absolute start-10 end-0 top-0 border-t ${g === 0 ? 'border-[#e7e3dc]' : g === 10 ? 'border-[#e2ddd4]' : 'border-[#f2f1ee]'}`} />
            </div>
          ))}
        </div>
        {!points.length ? (
          <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 text-center text-[13px] text-ink-faint">{emptyText}</div>
        ) : (
          <div className="absolute inset-y-0 start-10 end-0">
            {points.length > 1 && (
              <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <polyline fill="none" stroke={COULEUR.note} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                  points={points.map((p) => `${x(p.date)},${100 - y(p.note)}`).join(' ')} />
              </svg>
            )}
            {points.map((p, i) => {
              const on = hover === i;
              return (
                <button key={`${p.date}-${i}`} type="button"
                  aria-label={p.url ? t('{titre}, {date} : {note} sur 20 (ouvrir)', { titre: p.titre, date: long(p.date), note: decimal(p.note) }) : t('{titre}, {date} : {note} sur 20', { titre: p.titre, date: long(p.date), note: decimal(p.note) })}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  onClick={() => { if (hover === i && p.url) navigate(p.url); else setHover(i); }}
                  className="absolute flex h-7 w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  style={{ left: `${x(p.date)}%`, bottom: `${y(p.note)}%` }}>
                  <span className={`block rounded-full ring-2 ring-white transition-[width,height] ${on ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'}`}
                    style={{ background: COULEUR.note }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="fd-ltr mt-2 flex justify-between ps-10 text-[11px] text-ink-faint">
        <span>{court(debut)}</span>
        <span>{t('aujourd’hui')}</span>
      </div>
    </div>
  );
};

export default NotesChart;
