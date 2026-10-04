/**
 * Difficulty Helper Functions
 * Consolidated from multiple components (ExamHeader, ExerciseHeader, ExamCard, ContentCard, etc.)
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Get color classes for difficulty badges
 */
export const getDifficultyColor = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'hard':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

/**
 * Get translated difficulty label
 */
export const getDifficultyLabel = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy':
      return 'Facile';
    case 'medium':
      return 'Moyen';
    case 'hard':
      return 'Difficile';
    default:
      return 'Non spécifié';
  }
};
