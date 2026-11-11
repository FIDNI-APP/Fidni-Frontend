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

// 07/11/2026 (Natsu) : seules les questions difficiles et très difficiles sont signalées, en rouge, pour qu'on les
// voie ; facile et moyen n'apparaissent plus (trop de signes sur la feuille). Couleurs : .fd-diff-q (index.css).
const NIVEAUX: Partial<Record<QuestionDifficulty, { level: number; label: string; tone: string }>> = {
  hard: { level: 3, label: 'Difficile', tone: 'fd-diff-q font-semibold' },
  very_hard: { level: 4, label: 'Très difficile', tone: 'fd-diff-q fd-diff-q-fort font-semibold' },
};
/** La question a-t-elle un badge ? (sinon le barème reste seul). */
export const difficulteVisible = (difficulty?: string | null) => !!difficulty && !!NIVEAUX[difficulty as QuestionDifficulty];

export const QuestionDifficultyTag: React.FC<{ difficulty?: string | null; className?: string }> = ({ difficulty, className = '' }) => {
  const niveau = difficulty ? NIVEAUX[difficulty as QuestionDifficulty] : undefined;
  if (!niveau) return null;
  return (
    <span className={`inline-flex items-center gap-[0.35em] whitespace-nowrap rounded-full px-[0.55em] py-[0.3em] text-[0.75rem] leading-none tracking-[0.01em] ${niveau.tone} ${className}`}>
      <span className="sr-only">{t('Difficulté :')} </span>
      <DifficultyBars level={niveau.level} total={4} size="1em" />
      {t(niveau.label)}
    </span>
  );
};

/** Difficulté et barème forment un seul groupe (« Difficile · 1 pt »), toujours dans cet ordre. */
export const QuestionFacts: React.FC<{ difficulty?: string | null; points?: React.ReactNode; className?: string }> = ({ difficulty, points, className = '' }) => {
  const visible = difficulteVisible(difficulty);
  if (!visible && !points) return null;
  return (
    <span className={`inline-flex items-center gap-[0.45em] text-[0.75rem] leading-none text-ink-faint ${className}`}>
      <QuestionDifficultyTag difficulty={difficulty} />
      {points ? <span className="fd-nums">{points}</span> : null}
    </span>
  );
};

export default QuestionDifficultyTag;
