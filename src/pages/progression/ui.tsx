// Briques communes de « Ma progression ».
import React from 'react';
import { Link } from 'react-router-dom';
import type { ChapterStatus } from './types';
import { STATUS } from './status';

export function Section({ id, title, icon, hint, action, tour, children }: {
  id?: string; title: string; icon: React.ReactNode; hint?: string; action?: React.ReactNode; tour?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-line bg-white p-5 sm:p-6" data-tour={tour}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[16px] font-bold tracking-tight text-ink"><span className="text-ink-faint">{icon}</span>{title}</h2>
          {hint && <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-faint">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text, action }: { text: string; action?: { to: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-[#faf9f7] px-4 py-5 text-[13px] leading-relaxed text-ink-faint">
      {text}
      {action && <Link to={action.to} className="ml-1 font-semibold text-brand-hover hover:underline">{action.label} →</Link>}
    </div>
  );
}

/** Choix exclusif compact (périodes, mesures). */
export function Segmented<K extends string>({ label, value, options, onChange }: {
  label: string; value: K; options: { key: K; label: string }[]; onChange: (k: K) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-[#f2f1ee] p-0.5">
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)}
          className={`h-8 rounded-md px-2.5 text-[12.5px] ${value === o.key ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-ink-faint hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

/** Jauge fine (piste un cran plus clair que le remplissage). */
export function Meter({ pct, status, className = '' }: { pct: number; status: ChapterStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <div className={`h-1.5 overflow-hidden rounded-full ${s.track} ${className}`} role="img" aria-label={`${pct} %`}>
      <div className={`h-full rounded-full ${s.fill}`} style={{ width: `${Math.max(pct, 3)}%` }} />
    </div>
  );
}
