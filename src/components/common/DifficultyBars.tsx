// Difficulté en « barres de réseau » : une barre pleine pour Facile, deux pour Moyen, trois pour Difficile
// (Natsu, 07/10 : le point coloré ne disait rien). Couleur héritée du texte (currentColor).
import React from 'react';

const LEVEL: Record<string, number> = { easy: 1, medium: 2, hard: 3, facile: 1, moyen: 2, difficile: 3 };

export const difficultyLevel = (d?: string | null): number => LEVEL[(d ?? '').toLowerCase()] ?? 0;

export const DifficultyBars: React.FC<{ difficulty?: string | null; level?: number; size?: number; className?: string }> = ({
  difficulty, level, size = 11, className,
}) => {
  const n = level ?? difficultyLevel(difficulty);
  if (!n) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={className} style={{ flexShrink: 0 }}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={i * 4.5} y={8 - i * 3.5} width="3" height={4 + i * 3.5} rx="1"
          fill="currentColor" opacity={i < n ? 1 : 0.25} />
      ))}
    </svg>
  );
};

export default DifficultyBars;
