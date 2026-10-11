// Briques communes de « Ma progression » (les en-têtes, sections et états vides viennent de components/space/Page).
import React from 'react';
import type { ChapterStatus } from './types';
import { STATUS } from './status';

/** Infobulle des graphiques : la valeur d'abord, le libellé ensuite. */
export function ChartTip({ left, flip, title, children }: { left: string; flip: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 text-[12px] shadow-md"
      style={{ left, transform: `translateX(${flip ? '-105%' : '5%'})` }}>
      {children}
      <p className="mt-0.5 text-ink-faint">{title}</p>
    </div>
  );
}

/**
 * Jauge fine (piste un cran plus clair que le remplissage). Un `span` affiché en bloc : elle peut se
 * placer dans un lien ou un bouton (plan de DS, lignes du programme).
 */
export function Meter({ pct, status, className = '' }: { pct: number; status: ChapterStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={`block h-1.5 overflow-hidden rounded-full ${s.track} ${className}`} role="img" aria-label={`${pct} %`}>
      <span className={`block h-full rounded-full ${s.fill}`} style={{ width: `${Math.max(pct, 3)}%` }} />
    </span>
  );
}
