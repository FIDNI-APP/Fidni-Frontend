// Shared gradient banner used on top of content cards (card view + full view).
// Renders the subject watermark, pill badges, save/edit/delete actions and title overlay.

import React from 'react';
import { Bookmark, Loader2, Check, Edit, Trash2 } from 'lucide-react';

export interface SubjectTheme {
  from: string;
  to: string;
  light: string;
  text: string;
  glow: string;
}

export const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  Analyse:           { from: '#4f46e5', to: '#818cf8', light: '#eef2ff', text: '#4338ca', glow: 'rgba(79,70,229,.2)' },
  Mathématiques:     { from: '#4f46e5', to: '#818cf8', light: '#eef2ff', text: '#4338ca', glow: 'rgba(79,70,229,.2)' },
  Algèbre:           { from: '#0891b2', to: '#22d3ee', light: '#ecfeff', text: '#0e7490', glow: 'rgba(8,145,178,.2)' },
  Géométrie:         { from: '#7c3aed', to: '#a78bfa', light: '#f5f3ff', text: '#5b21b6', glow: 'rgba(124,58,237,.2)' },
  Probabilités:      { from: '#059669', to: '#34d399', light: '#ecfdf5', text: '#047857', glow: 'rgba(5,150,105,.2)' },
  Statistiques:      { from: '#059669', to: '#34d399', light: '#ecfdf5', text: '#047857', glow: 'rgba(5,150,105,.2)' },
  Physique:          { from: '#d97706', to: '#fbbf24', light: '#fffbeb', text: '#a16207', glow: 'rgba(217,119,6,.2)' },
  'Physique-Chimie': { from: '#d97706', to: '#fbbf24', light: '#fffbeb', text: '#a16207', glow: 'rgba(217,119,6,.2)' },
  SVT:               { from: '#16a34a', to: '#86efac', light: '#f0fdf4', text: '#15803d', glow: 'rgba(22,163,74,.2)' },
  Français:          { from: '#be185d', to: '#f472b6', light: '#fdf2f8', text: '#9d174d', glow: 'rgba(190,24,93,.2)' },
  Philosophie:       { from: '#6d28d9', to: '#a78bfa', light: '#f5f3ff', text: '#5b21b6', glow: 'rgba(109,40,217,.2)' },
  Anglais:           { from: '#0891b2', to: '#22d3ee', light: '#ecfeff', text: '#0e7490', glow: 'rgba(8,145,178,.2)' },
};

const DEFAULT_THEME: SubjectTheme = SUBJECT_THEMES.Analyse;
export const getSubjectTheme = (name?: string): SubjectTheme =>
  (name && SUBJECT_THEMES[name]) || DEFAULT_THEME;

export interface DifficultyConfig {
  label: string;
  bg: string;
  text: string;
}
export const DIFFICULTY_CFG: Record<'easy' | 'medium' | 'hard', DifficultyConfig> = {
  easy:   { label: 'Facile',    bg: '#dcfce7', text: '#15803d' },
  medium: { label: 'Moyen',     bg: '#fef9c3', text: '#a16207' },
  hard:   { label: 'Difficile', bg: '#fee2e2', text: '#b91c1c' },
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

export const ContentCardBanner: React.FC<ContentCardBannerProps> = ({
  title,
  subjectName,
  typeLabel,
  theme,
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
  const t = theme || getSubjectTheme(subjectName);
  const watermark = subjectName || typeLabel;

  return (
    <div
      className="relative flex-shrink-0"
      style={{
        height,
        background: `linear-gradient(135deg,${t.from},${t.to})`,
        overflow: 'hidden',
      }}
    >
      {/* Subject watermark */}
      <span
        style={{
          position: 'absolute',
          right: -10,
          top: -14,
          fontSize: Math.max(56, height * 0.66),
          fontWeight: 800,
          color: 'rgba(255,255,255,.10)',
          userSelect: 'none',
          lineHeight: 1,
          pointerEvents: 'none',
          letterSpacing: '-0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        {watermark}
      </span>

      {/* Decorative bubble */}
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          left: -20,
          width: 76,
          height: 76,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.07)',
        }}
      />

      {/* Top-row badges */}
      <div className="absolute top-3 left-4 right-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            style={{
              background: 'rgba(255,255,255,.22)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 99,
              letterSpacing: '.04em',
              backdropFilter: 'blur(4px)',
            }}
          >
            {(subjectName || typeLabel).toUpperCase()}
          </span>
          {difficulty && (
            <span
              style={{
                background: difficulty.bg,
                color: difficulty.text,
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 99,
              }}
            >
              {difficulty.label}
            </span>
          )}
          {isNationalExam && (
            <span
              style={{
                background: '#fef3c7',
                color: '#92400e',
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 99,
              }}
            >
              National{nationalYear ? ` ${nationalYear}` : ''}
            </span>
          )}
          {isSolved && (
            <span
              style={{
                background: 'rgba(255,255,255,.22)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                backdropFilter: 'blur(4px)',
              }}
            >
              <Check className="w-2.5 h-2.5" /> Résolu
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {showOwnerActions && onEdit && (
            <button
              onClick={onEdit}
              style={{
                padding: 6,
                borderRadius: 9,
                background: 'rgba(255,255,255,.18)',
                color: '#fff',
                backdropFilter: 'blur(6px)',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Modifier"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {showOwnerActions && onDelete && (
            <button
              onClick={onDelete}
              style={{
                padding: 6,
                borderRadius: 9,
                background: 'rgba(255,255,255,.18)',
                color: '#fff',
                backdropFilter: 'blur(6px)',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              style={{
                padding: 6,
                borderRadius: 9,
                background: isSaved ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.18)',
                color: isSaved ? t.text : '#fff',
                backdropFilter: 'blur(6px)',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label={isSaved ? 'Retirer' : 'Sauvegarder'}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3
        className="absolute left-4 right-4 line-clamp-2"
        style={{
          bottom: 12,
          fontSize: height >= 110 ? 18 : 15,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.01em',
          textShadow: '0 1px 4px rgba(0,0,0,.18)',
          lineHeight: 1.25,
        }}
      >
        {title}
      </h3>
    </div>
  );
};
