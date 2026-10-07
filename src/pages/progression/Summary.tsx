// En haut de « Ma progression » : quatre repères, chacun mène à sa partie de la page.
import React from 'react';
import { CheckCircle2, Clock, Flame, Map as MapIcon } from 'lucide-react';
import type { ProgressionData } from './types';
import { STATUS, STATUS_ORDER } from './status';
import { duration, plural } from './format';

export function Summary({ data, onJump }: { data: ProgressionData; onJump: (id: string) => void }) {
  const ch = data.summary.chapters;
  const s = data.summary;
  const parts = STATUS_ORDER.filter((k) => k !== 'todo' && ch[k] > 0);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="prog-resume">
      <Tile onClick={() => onJump('programme')} icon={<MapIcon className="h-4 w-4" />} label="Programme"
        value={`${ch.mastered}`} unit={`/ ${ch.total} chapitre${ch.total > 1 ? 's' : ''} maîtrisé${ch.mastered > 1 ? 's' : ''}`}>
        {ch.total > 0 && (
          <div className="mt-2.5 flex h-2 gap-[2px] overflow-hidden rounded-full bg-[#f2f1ee]" role="img"
            aria-label={parts.map((k) => `${ch[k]} ${STATUS[k].label.toLowerCase()}`).join(', ') || 'aucun chapitre commencé'}>
            {parts.map((k) => (
              <span key={k} className={STATUS[k].fill} style={{ width: `${(ch[k] / ch.total) * 100}%` }} />
            ))}
          </div>
        )}
        <p className="mt-1.5 truncate text-[12px] text-ink-faint">
          {ch.good + ch.weak > 0 ? `${ch.good} en bonne voie · ${ch.weak} à renforcer` : `${ch.total - ch.todo} commencé${ch.total - ch.todo > 1 ? 's' : ''}`}
        </p>
      </Tile>
      <Tile onClick={() => onJump('evolution')} icon={<CheckCircle2 className="h-4 w-4" />} label="Questions réussies"
        value={String(s.questions_ok)} unit={`sur ${plural(s.questions, 'évaluée', 'évaluées')}`}>
        <p className="mt-1.5 text-[12px] text-ink-faint">{s.questions_ok_week ? `+${s.questions_ok_week} ces 7 derniers jours` : 'rien de neuf cette semaine'}</p>
      </Tile>
      <Tile onClick={() => onJump('temps')} icon={<Clock className="h-4 w-4" />} label="Temps d’étude"
        value={duration(data.time.week)} unit="sur 7 jours">
        <p className="mt-1.5 text-[12px] text-ink-faint">{duration(data.time.total_seconds)} depuis le début</p>
      </Tile>
      <Tile onClick={() => onJump('temps')} icon={<Flame className="h-4 w-4" />} label="Série"
        value={String(s.streak.current)} unit={`jour${s.streak.current > 1 ? 's' : ''} d’affilée`}>
        <p className="mt-1.5 text-[12px] text-ink-faint">record : {plural(s.streak.best, 'jour', 'jours')}</p>
      </Tile>
    </div>
  );
}

function Tile({ icon, label, value, unit, onClick, children }: {
  icon: React.ReactNode; label: string; value: string; unit: string; onClick: () => void; children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col rounded-2xl border border-line bg-white px-4 py-3.5 text-left transition-colors hover:border-[#d6d2ca] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">{icon}{label}</span>
      <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[28px] font-bold leading-none text-ink">{value}</span>
        <span className="text-[12.5px] text-ink-faint">{unit}</span>
      </span>
      {children}
    </button>
  );
}
