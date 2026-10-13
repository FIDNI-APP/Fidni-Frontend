// « Mes chapitres » (13/10/2026) : les chapitres à travailler en priorité (ordre de l'objectif, backend
// apps/users/objectif.py), chacun avec son état, sa maîtrise et une action immédiate. Un clic sur la ligne ouvre le
// détail (ChapitreSheet) ; « Tout le programme » déplie la liste complète.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { trackAction } from '@/lib/usage';
import { actionUrl } from './links';
import { chapterAction } from './actions';
import { ETAT } from './etat';
import { EtatPill } from './Objectif';
import type { ChapterProgress } from './types';

const TOP = 5;

export function MesChapitres({ chapters, onOpen, className = '' }: {
  chapters: ChapterProgress[];
  onOpen: (id: number) => void;
  className?: string;
}) {
  const [all, setAll] = useState(false);
  const ordered = [...chapters].sort((a, b) => (a.priorite ?? 999) - (b.priorite ?? 999));
  const shown = all ? ordered : ordered.slice(0, TOP);
  return (
    <section data-tour="prog-carte" aria-labelledby="chapitres-titre" className={`rounded-2xl border border-line bg-white ${className}`}>
      <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-5 sm:px-6">
        <h2 id="chapitres-titre" className="fd-display text-[20px] text-ink">Mes chapitres</h2>
        <p className="text-[12.5px] text-ink-faint">{all ? 'Tout le programme' : 'À travailler en priorité'}</p>
      </div>
      <ul className="divide-y divide-line">
        {shown.map((c) => <Row key={c.id} c={c} onOpen={onOpen} />)}
      </ul>
      {ordered.length > TOP && (
        <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}
          className="flex min-h-12 w-full items-center justify-center gap-1 border-t border-line text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-paper hover:text-ink">
          {all ? 'Seulement les prioritaires' : `Tout le programme (${ordered.length})`}
          <ChevronDown className={`h-4 w-4 transition-transform ${all ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
}

function Row({ c, onOpen }: { c: ChapterProgress; onOpen: (id: number) => void }) {
  const etat = c.etat ?? 'non_evalue';
  const e = ETAT[etat];
  const action = chapterAction(c);
  const pct = etat === 'non_evalue' ? null : c.pct ?? null;
  return (
    <li className="flex items-center gap-2 px-3 py-2 sm:px-4">
      <button type="button" onClick={() => { trackAction('prog-chapitre'); onOpen(c.id); }}
        className="group flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-paper">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{c.name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <EtatPill etat={etat} enProgres={c.en_progres} size="sm" />
            {pct !== null && (
              <span className="flex min-w-[96px] flex-1 items-center gap-2">
                <span className={`block h-1.5 flex-1 overflow-hidden rounded-full ${e.track}`} role="img" aria-label={`${pct} %`}>
                  <span className={`block h-full rounded-full ${e.fill}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                </span>
                <span className="fd-nums w-9 text-right text-[12.5px] font-semibold text-ink-soft">{pct} %</span>
              </span>
            )}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-ink" aria-hidden />
      </button>
      <Link to={actionUrl(action, c)} onClick={() => trackAction('prog-chapitre-action')}
        className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-line px-3 text-[13px] font-semibold text-ink transition-colors hover:border-ink">
        {action.label}
      </Link>
    </li>
  );
}
