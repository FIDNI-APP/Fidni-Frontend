// Difficulté en « barres de réseau » : une barre pleine pour Facile, deux pour Moyen, trois pour Difficile
// (Natsu, 07/10 : le point coloré ne disait rien). Couleur héritée du texte (currentColor).
import React from 'react';

const LEVEL: Record<string, number> = { easy: 1, medium: 2, hard: 3, facile: 1, moyen: 2, difficile: 3 };

export const difficultyLevel = (d?: string | null): number => LEVEL[(d ?? '').toLowerCase()] ?? 0;

/** `total` : 3 barres pour un contenu ; 4 pour une question, qui peut être « très difficile » (07/11/2026). */
export const DifficultyBars: React.FC<{ difficulty?: string | null; level?: number; size?: number | string; className?: string; total?: 3 | 4 }> = ({
  difficulty, level, size = 11, className, total = 3,
}) => {
  const n = level ?? difficultyLevel(difficulty);
  if (!n) return null;
  const [pas, largeur, base, marche] = total === 4 ? [10 / 3, 2, 3, 3] : [4.5, 3, 4, 3.5];
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={className} style={{ flexShrink: 0 }}>
      {Array.from({ length: total }, (_, i) => (
        <rect key={i} x={i * pas} y={12 - base - i * marche} width={largeur} height={base + i * marche} rx="1"
          fill="currentColor" opacity={i < n ? 1 : 0.25} />
      ))}
    </svg>
  );
};

export default DifficultyBars;
