// Éléments visuels des DS (« Mon prochain DS », 08/10/2026) : page de calendrier, compte à rebours,
// jauge « Prêt à … % ».
import React from 'react';
import { whenLabel } from '@/lib/api/devoirsApi';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** Page de calendrier : jour de la semaine, quantième, mois. */
export function DateTile({ date, size = 'md', urgent = false }: { date: string; size?: 'sm' | 'md' | 'lg'; urgent?: boolean }) {
  const d = new Date(`${date}T12:00:00`);
  const dims = size === 'lg' ? 'w-[68px]' : size === 'sm' ? 'w-[46px]' : 'w-[56px]';
  const num = size === 'lg' ? 'text-[28px]' : size === 'sm' ? 'text-[18px]' : 'text-[22px]';
  return (
    <div aria-hidden className={`${dims} flex shrink-0 flex-col self-start overflow-hidden rounded-xl border border-line bg-white text-center shadow-[0_1px_0_rgba(20,18,16,.05)]`}>
      <span className={`py-[3px] text-[10px] font-bold uppercase tracking-[.08em] text-white ${urgent ? 'bg-[#a23b34]' : 'bg-ink'}`}>
        {DAYS[d.getDay()]}
      </span>
      <span className={`fd-nums pt-1 font-bold leading-none text-ink ${num}`} style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
        {d.getDate()}
      </span>
      <span className="pb-1.5 pt-0.5 text-[10.5px] font-semibold uppercase tracking-[.04em] text-ink-faint">{MONTHS[d.getMonth()]}</span>
    </div>
  );
}

/** « Aujourd’hui », « Demain », « Dans 3 jours » : de plus en plus visible à l'approche. */
export function Countdown({ days, className = '' }: { days: number; className?: string }) {
  const tone = days < 0
    ? 'bg-[#f2f1ee] text-ink-faint'
    : days <= 1 ? 'bg-[#fbecea] text-[#a23b34]'
      : days <= 6 ? 'bg-gold-soft text-[#8a6318]'
        : 'bg-[#f2f1ee] text-ink-soft';
  const label = days < 0 ? 'Passé' : whenLabel(days);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${tone} ${className}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}

const readinessTone = (pct: number) => (pct >= 80 ? 'bg-brand' : pct >= 60 ? 'bg-brand/60' : 'bg-gold');

/** « Prêt à 62 % » + jauge ; sans mesure, une invitation à en avoir une. */
export function Readiness({ value, compact = false }: { value: number | null | undefined; compact?: boolean }) {
  if (value === null || value === undefined) {
    return (
      <p className={`${compact ? 'text-[12px]' : 'text-[13px]'} text-ink-faint`}>
        Pas encore de mesure : un quiz ou quelques exercices suffisent.
      </p>
    );
  }
  return (
    <div className="min-w-0">
      <p className={`${compact ? 'text-[12px]' : 'text-[13px]'} text-ink-soft`}>
        Prêt à <b className="fd-nums font-bold text-ink">{value} %</b>
      </p>
      <div className={`mt-1.5 overflow-hidden rounded-full bg-[#f2f1ee] ${compact ? 'h-1.5' : 'h-2'}`} role="img" aria-label={`Prêt à ${value} %`}>
        <div className={`h-full rounded-full ${readinessTone(value)}`} style={{ width: `${Math.max(value, 3)}%` }} />
      </div>
    </div>
  );
}

/** Anneau de préparation (page du plan). */
export function ReadinessRing({ value, size = 92 }: { value: number | null; size?: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  const color = value === null ? '#e7e3dc' : pct >= 80 ? '#1a7a4a' : pct >= 60 ? '#5fa47f' : '#c0892f';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={value === null ? 'Pas encore de mesure' : `Prêt à ${pct} %`} className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f2f1ee" strokeWidth="9" />
      {value !== null && (
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(Math.max(pct, 2) / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      )}
      <text x="50" y={value === null ? 57 : 55} textAnchor="middle" fontSize={value === null ? 26 : 22} fontWeight={700}
        fill={value === null ? '#9a958c' : '#1a1a1a'} style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
        {value === null ? '?' : `${pct}%`}
      </text>
    </svg>
  );
}

/** Note d'un DS : verte à partir de 10. */
export function GradeBadge({ grade }: { grade: number }) {
  const ok = grade >= 10;
  return (
    <span className={`fd-nums inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-bold ${ok ? 'bg-brand-soft text-brand-hover' : 'bg-gold-soft text-[#8a6318]'}`}>
      {String(grade).replace('.', ',')} / 20
    </span>
  );
}

export function DifficultyDot({ level }: { level: 'easy' | 'medium' | 'hard' | null }) {
  if (!level) return null;
  const label = level === 'easy' ? 'Facile' : level === 'medium' ? 'Moyen' : 'Difficile';
  const dots = level === 'easy' ? 1 : level === 'medium' ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-faint" title={label}>
      <span aria-hidden className="inline-flex gap-[2px]">
        {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < dots ? 'bg-ink-soft' : 'bg-[#e7e3dc]'}`} />)}
      </span>
      {label}
    </span>
  );
}

export const Card: React.FC<{ className?: string; children: React.ReactNode; id?: string }> = ({ className = '', children, id }) => (
  <section id={id} className={`scroll-mt-20 rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}>{children}</section>
);
