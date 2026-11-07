// Difficulté d'une question, à côté de ses points (07/11/2026) : des élèves trouvaient le label du contenu trompeur, un
// exercice « moyen » pouvant cacher une question très difficile. Quatre barres ici (« très difficile » n'existe que pour
// une question). Rien à afficher pendant une épreuve : le rendu ne le passe pas quand `locked`.
//
// Une information, pas un bouton : ni fond, ni cadre, ni animation, pour qu'elle ne passe pas devant l'énoncé. La
// hiérarchie vient du poids (la couleur n'arrive qu'au dernier niveau) ; les jetons --c-* suivent le mode sombre ; les
// tailles en rem suivent la taille de texte choisie par l'élève.
import React from 'react';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { t } from '@/i18n';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'very_hard';

const NIVEAUX: Record<QuestionDifficulty, { level: number; label: string; tone: string }> = {
  easy: { level: 1, label: 'Facile', tone: 'text-ink-faint' },
  medium: { level: 2, label: 'Moyen', tone: 'text-ink-faint' },
  hard: { level: 3, label: 'Difficile', tone: 'text-ink-soft font-medium' },
  very_hard: { level: 4, label: 'Très difficile', tone: 'text-gold-strong font-semibold' },
};

export const QuestionDifficultyTag: React.FC<{ difficulty?: string | null; className?: string }> = ({ difficulty, className = '' }) => {
  const niveau = difficulty ? NIVEAUX[difficulty as QuestionDifficulty] : undefined;
  if (!niveau) return null;
  return (
    <span className={`inline-flex items-center gap-[0.35em] whitespace-nowrap text-[0.75rem] leading-none tracking-[0.01em] contrast-more:text-ink ${niveau.tone} ${className}`}>
      <span className="sr-only">{t('Difficulté :')} </span>
      <DifficultyBars level={niveau.level} total={4} size="1em" />
      {t(niveau.label)}
    </span>
  );
};

/** Difficulté et barème forment un seul groupe (« Difficile · 1 pt »), toujours dans cet ordre. */
export const QuestionFacts: React.FC<{ difficulty?: string | null; points?: React.ReactNode; className?: string }> = ({ difficulty, points, className = '' }) => {
  if (!difficulty && !points) return null;
  return (
    <span className={`inline-flex items-center gap-[0.45em] text-[0.75rem] leading-none text-ink-faint ${className}`}>
      <QuestionDifficultyTag difficulty={difficulty} />
      {difficulty && points ? <span aria-hidden className="opacity-60">·</span> : null}
      {points ? <span className="fd-nums">{points}</span> : null}
    </span>
  );
};

export default QuestionDifficultyTag;
