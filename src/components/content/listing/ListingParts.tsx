// Petits éléments des cartes de liste (exercices, examens, leçons).
import React from 'react';
import { Bookmark, Check, Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { DIFFICULTY, type Progress } from './listingUtils';

export const ProgressPill: React.FC<{ progress: Progress }> = ({ progress }) =>
  progress === 'success' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-brand-soft text-brand-hover">
      <Check className="w-3 h-3" strokeWidth={2.5} /> Validé
    </span>
  ) : progress === 'review' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-gold-soft text-gold-strong">
      <RotateCcw className="w-3 h-3" /> À revoir
    </span>
  ) : null;

export const DifficultyChip: React.FC<{ difficulty?: string | null }> = ({ difficulty }) => {
  const d = difficulty ? DIFFICULTY[difficulty] : null;
  if (!d) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold" style={{ background: d.bg, color: d.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.dot }} aria-hidden />
      {d.label}
    </span>
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
