// Difficulté d'une question, à côté de ses points (07/11/2026) : des élèves trouvaient le label du contenu trompeur, un
// exercice « moyen » pouvant cacher une question très difficile. Quatre barres ici (« très difficile » n'existe que pour
// une question). Rien à afficher pendant une épreuve : le rendu ne le passe pas quand `locked`.
import React from 'react';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { t } from '@/i18n';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'very_hard';

const NIVEAUX: Record<QuestionDifficulty, { level: number; label: string; tone: string }> = {
  easy: { level: 1, label: 'Facile', tone: 'text-ink-faint' },
  medium: { level: 2, label: 'Moyen', tone: 'text-ink-faint' },
  hard: { level: 3, label: 'Difficile', tone: 'text-ink-soft' },
  very_hard: { level: 4, label: 'Très difficile', tone: 'text-gold-strong font-medium' },
};

export const QuestionDifficultyTag: React.FC<{ difficulty?: string | null; className?: string }> = ({ difficulty, className = '' }) => {
  const niveau = difficulty ? NIVEAUX[difficulty as QuestionDifficulty] : undefined;
  if (!niveau) return null;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[12px] ${niveau.tone} ${className}`}>
      <DifficultyBars level={niveau.level} total={4} />
      {t(niveau.label)}
    </span>
  );
};

export default QuestionDifficultyTag;
