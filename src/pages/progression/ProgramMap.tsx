// Carte du programme : chaque chapitre du niveau, coloré par son état (icône + libellé), regroupé par
// domaine. Les états du haut servent aussi de filtre ; un clic sur un chapitre ouvre son détail.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map as MapIcon } from 'lucide-react';
import type { ChapterProgress, ChapterStatus } from './types';
import { STATUS, STATUS_ORDER } from './status';
import { Meter, Section } from './ui';

export function ProgramMap({ chapters, level, onOpen }: {
  chapters: ChapterProgress[];
  level: { id: number; name: string } | null;
  onOpen: (id: number) => void;
}) {
  const [only, setOnly] = useState<ChapterStatus | null>(null);
  const counts = useMemo(() => {
    const c: Record<ChapterStatus, number> = { mastered: 0, good: 0, weak: 0, started: 0, todo: 0 };
    chapters.forEach((ch) => { c[ch.status] += 1; });
    return c;
  }, [chapters]);
  const groups = useMemo(() => {
    const shown = only ? chapters.filter((c) => c.status === only) : chapters;
    const map = new Map<string, ChapterProgress[]>();
    shown.forEach((c) => map.set(c.subfield, [...(map.get(c.subfield) ?? []), c]));
    return [...map.entries()];
  }, [chapters, only]);

  return (
    <Section id="programme" tour="prog-carte" icon={<MapIcon className="h-4 w-4" />} title="Mon programme"
      hint={level
        ? `Les chapitres de ${level.name}. Clique sur un chapitre pour voir ce que tu maîtrises et ce qui reste à travailler.`
        : 'Les chapitres que tu as travaillés. Clique sur un chapitre pour voir le détail.'}>
      {!level && (
        <p className="mb-4 rounded-xl border border-gold-line bg-gold-soft px-4 py-3 text-[13px] text-ink-soft">
          <Link to="/complete-profile" className="font-semibold text-brand-hover hover:underline">Indique ton niveau</Link>{' '}
          pour voir tout ton programme, y compris les chapitres pas encore commencés.
        </p>
      )}

      {/* Les états : légende ET filtre (un clic n'affiche que ces chapitres). */}
      <div role="group" aria-label="Filtrer par état" className="mb-5 flex flex-wrap gap-2">
        {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => {
          const st = STATUS[s];
          const Icon = st.icon;
          const active = only === s;
          return (
            <button key={s} type="button" aria-pressed={active} onClick={() => setOnly(active ? null : s)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink'}`}>
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : st.text}`} />
              {st.label}
              <span className={active ? 'text-white/70' : 'text-ink-faint'}>{counts[s]}</span>
            </button>
          );
        })}
        {only && (
          <button type="button" onClick={() => setOnly(null)} className="px-2 text-[12.5px] font-semibold text-brand-hover hover:underline">
            Tout afficher
          </button>
        )}
      </div>

      {chapters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-[#faf9f7] px-4 py-5 text-[13px] text-ink-faint">
          Aucun chapitre pour l’instant : commence un exercice, ta carte se remplira au fil de ton travail.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([subfield, list]) => (
            <div key={subfield}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{subfield}</h3>
              <ul className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((c) => <Tile key={c.id} chapter={c} onOpen={onOpen} />)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Tile({ chapter: c, onOpen }: { chapter: ChapterProgress; onOpen: (id: number) => void }) {
  const st = STATUS[c.status];
  const Icon = st.icon;
  const detail = c.mastery !== null ? `${c.mastery} %` : null;
  return (
    <li>
      <button type="button" onClick={() => onOpen(c.id)}
        title={c.status === 'started' ? 'Pas encore assez de questions évaluées pour un pourcentage' : undefined}
        className={`flex h-full w-full flex-col rounded-xl border px-3 py-2.5 text-left transition-colors sm:px-3.5 sm:py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${st.tile}`}>
        <span className={`line-clamp-2 text-[13.5px] font-semibold leading-snug ${c.status === 'todo' ? 'text-ink-soft' : 'text-ink'}`}>{c.name}</span>
        <span className={`mt-1.5 inline-flex flex-wrap items-center gap-x-1 text-[12px] font-semibold ${st.text}`}>
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><Icon className="h-3.5 w-3.5 shrink-0" />{st.label}</span>
          {detail && <span className="whitespace-nowrap font-medium opacity-80">· {detail}</span>}
        </span>
        {c.mastery !== null && <Meter pct={c.mastery} status={c.status} className="mt-2" />}
      </button>
    </li>
  );
}
