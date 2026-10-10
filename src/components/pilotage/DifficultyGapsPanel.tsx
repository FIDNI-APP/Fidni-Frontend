/**
 * Pilotage › À traiter › « Écarts de difficulté » (10/10/2026) : contenus dont le ressenti des élèves (avis
 * « plus facile / plus dur » et réussite réelle) s'écarte de la difficulté affichée. Rien n'est changé tout
 * seul : l'auteur corrige à la main dans l'éditeur. Backend : `todo.difficulty_gaps` (things/difficulty.py).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gauge, Pencil } from 'lucide-react';
import { DifficultyBars } from '@/components/common/DifficultyBars';

type Level = 'easy' | 'medium' | 'hard';
export interface DifficultyGap {
  id: number; type: string; title: string; url: string; edit_url?: string;
  declared: Level | string | null; felt: Level | string | null;
  n: number; success_pct: number | null;
  votes?: { easier: number; as_said: number; harder: number } | null;
  basis?: 'avis' | 'reussite' | 'annonce' | string | null;
}

const LEVEL: Record<string, { label: string; text: string; bg: string }> = {
  easy: { label: 'Facile', text: '#15633c', bg: '#eaf3ed' },
  medium: { label: 'Moyen', text: '#9a6e1c', bg: '#faf3e2' },
  hard: { label: 'Difficile', text: '#a23b34', bg: '#fbecea' },
};
const TYPE_LABEL: Record<string, string> = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' };
const BASIS: Record<string, string> = { avis: 'd’après les avis', reussite: 'd’après la réussite' };
const SHOWN = 12;

const LevelChip: React.FC<{ level: string | null }> = ({ level }) => {
  const l = level ? LEVEL[level] : null;
  if (!l) return <span className="text-ink-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: l.bg, color: l.text }}>
      <DifficultyBars difficulty={level} /> {l.label}
    </span>
  );
};

export const DifficultyGapsPanel: React.FC<{ items: DifficultyGap[] }> = ({ items }) => {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <section className="fd-card mt-4 p-5" aria-labelledby="pilotage-ecarts">
      <h2 id="pilotage-ecarts" className="fd-display flex flex-wrap items-center gap-2 text-[16px] text-ink">
        <Gauge className="h-4 w-4 text-ink-soft" /> Écarts de difficulté
        {items.length > 0 && <span className="fd-nums rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[12px] font-semibold text-ink-soft">{items.length}</span>}
      </h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        Ressenti des élèves différent de la difficulté affichée (au moins 5 avis, ou 8 élèves et une réussite nettement
        hors de la bande annoncée). Comptes maison exclus. Si l’écart te paraît juste, corrige la difficulté dans l’éditeur.
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Aucun écart pour l’instant : il faut assez d’avis ou d’élèves sur un même contenu.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#f2f1ee]">
          {shown.map((g) => {
            const v = g.votes;
            const nVotes = v ? v.easier + v.as_said + v.harder : 0;
            return (
              <li key={g.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] text-ink-soft">{TYPE_LABEL[g.type] ?? g.type}</span>
                  <Link to={g.url} className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink hover:text-brand">{g.title}</Link>
                  <Link to={g.edit_url || `${g.url}/edit`}
                    className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-medium text-ink-soft hover:border-ink hover:text-ink">
                    <Pencil className="h-3.5 w-3.5" /> Modifier
                  </Link>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-soft">
                  <span className="text-ink-faint">Annoncé</span> <LevelChip level={g.declared} />
                  <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                  <span className="text-ink-faint">ressenti</span> <LevelChip level={g.felt} />
                  {g.basis && BASIS[g.basis] && <span className="text-[11.5px] text-ink-faint">({BASIS[g.basis]})</span>}
                </div>
                <p className="fd-nums mt-1 text-[12px] text-ink-faint">
                  {g.n ? <>{g.n} élève{g.n > 1 ? 's' : ''}</> : 'Aucun élève retenu'}
                  {g.success_pct !== null && g.n > 0 && <> · <b className="text-ink-soft">{g.success_pct} %</b> de réussite</>}
                  {' · '}
                  {nVotes && v
                    ? <>{nVotes} avis : {v.easier} plus facile · {v.as_said} comme annoncé · {v.harder} plus dur</>
                    : 'aucun avis'}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > SHOWN && (
        <button type="button" className="fd-btn-ghost mt-2 text-[12.5px]" onClick={() => setAll((x) => !x)}>
          {all ? 'Replier' : `Voir les ${items.length - SHOWN} autres`}
        </button>
      )}
    </section>
  );
};

export default DifficultyGapsPanel;
