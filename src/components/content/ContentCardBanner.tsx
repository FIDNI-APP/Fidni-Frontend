// En-tête partagé des cartes de contenu (vue cartes + vue complète) : étiquettes,
// actions (favori, modifier, supprimer) et titre.

import React from 'react';
import { Bookmark, Loader2, Check, Edit, Trash2 } from 'lucide-react';
import { DifficultyBars } from '@/components/common/DifficultyBars';

export interface SubjectTheme {
  from: string;
  to: string;
  light: string;
  text: string;
  glow: string;
}

// Monochrome "ink & paper" — every subject uses the same dark-ink header;
// the subject is identified by its label/watermark, not by colour.
const INK_THEME: SubjectTheme = {
  from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a', glow: 'rgba(20,18,16,.10)',
};

const DEFAULT_THEME: SubjectTheme = INK_THEME;
export const getSubjectTheme = (_name?: string): SubjectTheme => DEFAULT_THEME;

export interface DifficultyConfig {
  level?: number;
  label: string;
  bg: string;
  text: string;
}
// Tons adoucis, ceux du reste du site (vert / ambre / brique), au lieu des couleurs vives de Tailwind.
export const DIFFICULTY_CFG: Record<'easy' | 'medium' | 'hard', DifficultyConfig> = {
  easy:   { level: 1, label: 'Facile',    bg: '#eaf3ed', text: '#15633c' },
  medium: { level: 2, label: 'Moyen',     bg: '#faf3e2', text: '#9a6e1c' },
  hard:   { level: 3, label: 'Difficile', bg: '#fbecea', text: '#a23b34' },
};

export interface ContentCardBannerProps {
  title: string;
  subjectName?: string;
  typeLabel: string;
  theme?: SubjectTheme;
  difficulty?: DifficultyConfig | null;
  isSolved?: boolean;
  isNationalExam?: boolean;
  nationalYear?: number;
  // Save
  isSaved?: boolean;
  isSaving?: boolean;
  onSave?: (e: React.MouseEvent) => void;
  // Owner
  showOwnerActions?: boolean;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  // Layout — for the full view we want a slightly larger banner
  height?: number;
}

const chip: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, lineHeight: 1.35,
  display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
};

const iconBtn = (active = false): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${active ? '#cfe6d8' : '#e7e3dc'}`, background: active ? '#eaf3ed' : '#fff',
  color: active ? '#15633c' : '#6b6862', cursor: 'pointer', transition: 'border-color .15s, color .15s',
});

/**
 * En-tête des cartes de contenu : même langage que la page d'un exercice (fond clair,
 * étiquettes discrètes, titre en Fraunces). Il remplace un bandeau noir avec un grand
 * filigrane « Mathématiques » coupé, qui transformait chaque liste en pile de blocs sombres.
 */
export const ContentCardBanner: React.FC<ContentCardBannerProps> = ({
  title,
  subjectName,
  typeLabel,
  difficulty,
  isSolved,
  isNationalExam,
  nationalYear,
  isSaved,
  isSaving,
  onSave,
  showOwnerActions,
  onEdit,
  onDelete,
  height = 96,
}) => {
  const large = height >= 110;
  return (
    <div
      className="relative flex-shrink-0 flex flex-col"
      style={{
        minHeight: large ? undefined : height,
        padding: large ? '18px 24px 14px' : '14px 16px 12px',
        gap: large ? 10 : 8,
        background: '#fff',
        borderBottom: '1px solid #efece6',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span style={{ ...chip, background: '#f2f1ee', color: '#4b4843' }}>{subjectName || typeLabel}</span>
          {difficulty && (
            <span style={{ ...chip, background: difficulty.bg, color: difficulty.text }}>
              <DifficultyBars level={difficulty.level} size={10} />
              {difficulty.label}
            </span>
          )}
          {isNationalExam && (
            <span style={{ ...chip, background: '#faf3e2', color: '#9a6e1c' }}>
              National{nationalYear ? ` ${nationalYear}` : ''}
            </span>
          )}
          {isSolved && (
            <span style={{ ...chip, background: '#eaf3ed', color: '#15633c' }}>
              <Check className="w-3 h-3" /> Résolu
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showOwnerActions && onEdit && (
            <button onClick={onEdit} style={iconBtn()} aria-label="Modifier" title="Modifier">
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {showOwnerActions && onDelete && (
            <button onClick={onDelete} style={iconBtn()} aria-label="Supprimer" title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onSave && (
            <button onClick={onSave} data-tour="favori" style={iconBtn(!!isSaved)}
              aria-label={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              title={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
              )}
            </button>
          )}
        </div>
      </div>

      <h3
        className="fd-display line-clamp-2"
        style={{ fontSize: large ? 21 : 17, color: '#1a1a1a', lineHeight: 1.25, margin: 0 }}
      >
        {title}
      </h3>
    </div>
  );
};
