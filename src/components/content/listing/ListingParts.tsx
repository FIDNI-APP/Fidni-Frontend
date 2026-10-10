// Petits éléments des cartes de liste (exercices, examens, leçons).
// Mêmes mots partout pour l'état de l'élève : « Réussi », « À revoir », « Pas encore fait ».
import React, { useState } from 'react';
import { Bookmark, Check, Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { Felt, UserProgress } from '@/types/content';
import { DIFFICULTY, feltTooltip, type Progress } from './listingUtils';
import { DifficultyBars } from '@/components/common/DifficultyBars';

export const ProgressPill: React.FC<{ progress: Progress }> = ({ progress }) =>
  progress === 'success' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-brand-soft text-brand-hover">
      <Check className="w-3 h-3" strokeWidth={2.5} /> Réussi
    </span>
  ) : progress === 'review' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-gold-soft text-gold-strong">
      <RotateCcw className="w-3 h-3" /> À revoir
    </span>
  ) : null;

/**
 * Difficulté annoncée par l'auteur ; « Moyen · ressenti Difficile » quand les élèves l'ont vécu autrement
 * (backend things/difficulty.py), avec en infobulle « 34 % des 22 élèves l'ont réussi · 9 avis ».
 * `interactive` (cartes de liste, hors de tout lien) : un toucher ouvre l'explication, sinon invisible sur
 * téléphone (pas de survol) et cachée sous le lien de la carte sur ordinateur.
 */
export const DifficultyChip: React.FC<{ difficulty?: string | null; felt?: Felt | null; interactive?: boolean }> = ({
  difficulty, felt, interactive = false,
}) => {
  const [open, setOpen] = useState(false);
  const d = difficulty ? DIFFICULTY[difficulty] : null;
  if (!d) return null;
  const f = felt?.differs ? DIFFICULTY[felt.level] : null;
  const tip = f && felt ? `Ressenti des élèves : ${f.label}. ${feltTooltip(felt)}` : undefined;
  const chip = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold';
  const inner = (
    <>
      <DifficultyBars difficulty={difficulty} />
      {d.label}
      {f && (
        <span className="font-medium" style={{ color: f.text }}>
          <span aria-hidden>· </span>ressenti {f.label}
        </span>
      )}
    </>
  );
  if (!f || !interactive) {
    return (
      <span className={chip} style={{ background: d.bg, color: d.text }} title={tip}>
        {inner}
        {tip && <span className="sr-only"> ({tip})</span>}
      </span>
    );
  }
  return (
    <span className="relative z-10 inline-flex">
      <button type="button" aria-expanded={open} title={tip}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className={`${chip} relative cursor-help before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand`}
        style={{ background: d.bg, color: d.text }}>
        {inner}
        <span className="sr-only"> ({tip})</span>
      </button>
      {open && (
        <span role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-max max-w-[240px] rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-medium leading-snug text-white shadow-lg">
          {tip}
        </span>
      )}
    </span>
  );
};

/** Travail commencé : fine barre « 3/6 questions » (questions déjà évaluées par l'élève). */
export const QuestionProgressBar: React.FC<{ progress: UserProgress }> = ({ progress }) => {
  const pct = Math.min(100, Math.round((progress.assessed / progress.total) * 100));
  return (
    <div className="flex items-center gap-2" title={`${progress.success} réussie${progress.success > 1 ? 's' : ''} sur ${progress.assessed} évaluée${progress.assessed > 1 ? 's' : ''}`}>
      <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-[#efece6] overflow-hidden" role="progressbar"
        aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.assessed}
        aria-label="Questions évaluées">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="fd-nums text-[12px] font-medium text-ink-faint">{progress.assessed}/{progress.total} questions</span>
    </div>
  );
};

export const NationalTag: React.FC<{ year?: number | null }> = ({ year }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-gold-soft text-gold-strong">
    Bac national{year ? ` ${year}` : ''}
  </span>
);

const iconBtn = 'relative z-10 w-9 h-9 rounded-lg inline-flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';

export const BookmarkButton: React.FC<{ saved: boolean; busy: boolean; onClick: (e: React.MouseEvent) => void }> = ({ saved, busy, onClick }) => (
  <button type="button" onClick={onClick} data-tour="favori"
    className={`${iconBtn} ${saved ? 'text-brand hover:bg-brand-soft' : 'text-ink-faint hover:text-ink hover:bg-[#f2f1ee]'}`}
    aria-label={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={saved}
    title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />}
  </button>
);

export const OwnerButtons: React.FC<{ onEdit?: () => void; onDelete?: () => void }> = ({ onEdit, onDelete }) => (
  <>
    {onEdit && (
      <button type="button" className={`${iconBtn} text-ink-faint hover:text-ink hover:bg-[#f2f1ee]`} aria-label="Modifier" title="Modifier"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}>
        <Pencil className="w-4 h-4" />
      </button>
    )}
    {onDelete && (
      <button type="button" className={`${iconBtn} text-ink-faint hover:text-[#a23b34] hover:bg-[#fbecea]`} aria-label="Supprimer" title="Supprimer"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}>
        <Trash2 className="w-4 h-4" />
      </button>
    )}
  </>
);
