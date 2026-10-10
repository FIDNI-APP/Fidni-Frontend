// Rappel de l'accueil (« Mon prochain DS », 08/10/2026) : « DS de mathématiques demain : Limites,
// Dérivation », avec le bouton pour réviser. Seulement s'il y a un DS dans les deux semaines.
// 10/10/2026 : sans DS annoncé, une carte discrète en donne l'idée (« Un contrôle bientôt ? ») et ouvre le
// formulaire ; « Plus tard » la masque 14 jours. Un DS déjà annoncé plus loin que deux semaines : rien.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, X } from 'lucide-react';
import { testTitle, whenLabel } from '@/lib/api/devoirsApi';
import { DateTile } from './ui';
import type { NextTestState } from './useNextTest';

const LATER_KEY = 'fidni:annoncer-ds:plus-tard';
const LATER_DAYS = 14;

const hiddenForNow = () => {
  try { return Number(localStorage.getItem(LATER_KEY) || 0) > Date.now(); } catch { return false; }
};

export const NextTestReminder: React.FC<{
  state: NextTestState;
  /** Sans DS : montrer l'invitation (faux quand l'accueil propose déjà « Annonce ton prochain DS »). */
  invite?: boolean;
  onAnnounce: () => void;
}> = ({ state, invite = true, onAnnounce }) => {
  const [later, setLater] = useState(hiddenForNow);
  const test = state.test;

  if (!test) {
    if (!invite || !state.loaded || state.upcoming || later) return null;
    const dismiss = () => {
      try { localStorage.setItem(LATER_KEY, String(Date.now() + LATER_DAYS * 86400000)); } catch { /* stockage indisponible */ }
      setLater(true);
    };
    return (
      <section aria-label="Annoncer un DS" className="relative flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-white py-3.5 pl-4 pr-11 sm:pl-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
          <CalendarPlus className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 basis-[220px]">
          <p className="text-[15px] font-semibold leading-snug text-ink">Un contrôle bientôt ?</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">
            Dis-nous la date et les chapitres : on te prépare une révision ciblée et un DS blanc.
          </p>
        </div>
        <button type="button" onClick={onAnnounce} className="fd-btn-primary shrink-0" style={{ minHeight: 40 }}>
          Annoncer mon DS <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={dismiss} aria-label="Plus tard (masquer pendant 14 jours)" title="Plus tard"
          className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </section>
    );
  }

  const soon = test.days_left <= 1;
  const names = test.chapters.map((c) => c.name);
  return (
    <section aria-label="Prochain DS"
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${soon ? 'border-[#f0d4cf] bg-[#fdf6f4]' : 'border-line bg-white'}`}>
      <DateTile date={test.date} size="sm" urgent={soon} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-ink">
          {testTitle(test)} <span className={soon ? 'text-[#a23b34]' : 'text-ink-soft'}>{whenLabel(test.days_left)}</span>
        </p>
        <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-faint">
          {names.slice(0, 3).join(', ')}{names.length > 3 ? ` et ${names.length - 3} autre${names.length > 4 ? 's' : ''}` : ''}
        </p>
      </div>
      <Link to={`/revisions/ds/${test.id}`} className="fd-btn-primary shrink-0">
        Réviser <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
};

export default NextTestReminder;
