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

/**
 * Get comprehensive difficulty information including color, label, and icon color
 */
export const getDifficultyInfo = (difficulty: Difficulty) => {
  switch (difficulty) {
    case 'easy':
      return {
        label: 'Facile',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        fullColor: 'bg-green-100 text-green-800 border-green-300',
      };
    case 'medium':
      return {
        label: 'Moyen',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        fullColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      };
    case 'hard':
      return {
        label: 'Difficile',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        fullColor: 'bg-red-100 text-red-800 border-red-300',
      };
    default:
      return {
        label: 'Non spécifié',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        fullColor: 'bg-gray-100 text-gray-800 border-gray-300',
      };
  }
};

/**
 * Get progress bar color based on difficulty
 */
export const getDifficultyProgressColor = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'hard':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};
