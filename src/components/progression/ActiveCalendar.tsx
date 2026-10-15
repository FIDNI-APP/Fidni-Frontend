/**
 * Jours actifs (13/10/2026) : un calendrier, une case par jour (colonnes = semaines, lignes = lundi → dimanche), plus
 * foncée quand il a travaillé plus longtemps. 7 jours : une seule ligne de grandes cases. Par semaine (longue période) :
 * une case par semaine, foncée selon le nombre de jours actifs. Survol / clavier / toucher : le détail au-dessus ;
 * un clic sur un jour ouvre ce qu'il a fait.
 */
import React, { useState } from 'react';
import type { TableauJour } from '@/lib/api/tableauApi';
import { duration, parseDay } from '@/pages/progression/format';
import { RAMPE_VERTE } from './chart';
import { t, dateLocale } from '@/i18n';

const niveau = (r: TableauJour, pas: 'jour' | 'semaine') => {
  if (pas === 'semaine') return r.actifs === 0 ? 0 : r.actifs <= 1 ? 1 : r.actifs <= 3 ? 2 : r.actifs <= 5 ? 3 : 4;
  const m = r.secondes / 60;
  const q = r.reussies + r.partielles + r.ratees;
  if (!r.actifs) return 0;
  return m >= 60 ? 4 : m >= 30 ? 3 : m >= 10 || q >= 5 ? 2 : 1;
};

const resume = (r: TableauJour, pas: 'jour' | 'semaine') => {
  const q = r.reussies + r.partielles + r.ratees;
  const parts = [];
  if (pas === 'semaine') parts.push(r.actifs > 1 ? t('{n} jours actifs', { n: r.actifs }) : t('{n} jour actif', { n: r.actifs }));
  if (r.secondes) parts.push(duration(r.secondes));
  if (q) parts.push(q > 1 ? t('{n} questions', { n: q }) : t('{n} question', { n: q }));
  return parts.length ? parts.join(' · ') : t('Repos');
};

const titre = (iso: string, pas: 'jour' | 'semaine') => {
  const d = parseDay(iso);
  return pas === 'semaine'
    ? t('Semaine du {date}', { date: d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' }) })
    : d.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
};

export const ActiveCalendar: React.FC<{
  rows: TableauJour[];
  pas: 'jour' | 'semaine';
  headline: React.ReactNode;
  selected?: string | null;
  onPick?: (date: string) => void;
}> = ({ rows, pas, headline, selected = null, onPick }) => {
  const [hover, setHover] = useState<string | null>(null);
  const shown = rows.find((r) => r.date === hover) ?? null;
  const big = pas === 'jour' && rows.length <= 7;

  // Colonnes = semaines (lundi en haut) ; cases vides avant le premier jour.
  const cols: (TableauJour | null)[][] = [];
  if (pas === 'jour' && !big) {
    const lead = (parseDay(rows[0]?.date ?? '2026-01-05').getDay() + 6) % 7;
    const cells: (TableauJour | null)[] = [...Array(lead).fill(null), ...rows];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  }

  const cell = (r: TableauJour, size: string) => {
    const lv = niveau(r, pas);
    const on = hover === r.date || selected === r.date;
    const can = !!onPick && pas === 'jour' && r.actifs > 0;
    return (
      <button key={r.date} type="button" aria-label={`${titre(r.date, pas)} : ${resume(r, pas)}`}
        onMouseEnter={() => setHover(r.date)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.date)} onBlur={() => setHover(null)}
        onClick={() => { setHover(r.date); if (can) onPick!(r.date); }}
        className={`${size} rounded-[5px] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          on ? 'shadow-[0_0_0_2px_#1a1a1a]' : ''} ${can ? 'cursor-pointer' : 'cursor-default'}`}
        style={{ background: RAMPE_VERTE[lv] }} />
    );
  };

  return (
    <div>
      <div className="mb-4 min-w-0" aria-live="polite">
        <p className="text-[12.5px] text-ink-faint">{shown ? titre(shown.date, pas) : t('Sur la période')}</p>
        <p className="fd-nums mt-0.5 text-[18px] font-bold leading-tight text-ink sm:text-[20px]">{shown ? resume(shown, pas) : headline}</p>
      </div>

      {big ? (
        <div className="fd-ltr grid grid-cols-7 gap-2">
          {rows.map((r) => (
            <div key={r.date} className="flex flex-col items-center gap-1.5">
              {cell(r, 'h-14 w-full max-w-[72px]')}
              <span className="text-[11px] capitalize text-ink-faint">{parseDay(r.date).toLocaleDateString(dateLocale(), { weekday: 'short' }).replace('.', '')}</span>
            </div>
          ))}
        </div>
      ) : pas === 'semaine' ? (
        <div className="fd-ltr flex flex-wrap gap-[3px]">{rows.map((r) => cell(r, 'h-5 w-5'))}</div>
      ) : (
        <div className="fd-ltr flex gap-2">
          <div className="grid grid-rows-[repeat(7,auto)] gap-[3px] pt-px text-[10px] leading-[16px] text-ink-faint sm:leading-[18px]" aria-hidden>
            {['lun', '', 'mer', '', 'ven', '', 'dim'].map((d, i) => <span key={i} className="h-4 sm:h-[18px]">{d && t(d)}</span>)}
          </div>
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {cols.map((col, i) => (
              <div key={i} className="grid grid-rows-[repeat(7,auto)] gap-[3px]">
                {col.map((r, j) => (r ? cell(r, 'h-4 w-4 sm:h-[18px] sm:w-[18px]') : <span key={`v${j}`} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-faint" aria-hidden>
        {t('Moins')}
        {RAMPE_VERTE.map((c) => <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)}
        {t('Plus')}
      </div>
    </div>
  );
};

export default ActiveCalendar;
