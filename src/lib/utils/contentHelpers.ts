import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';

export const countQuestionsWithSolutions = (structure: FlexibleExerciseStructure | null | undefined): number => {
  if (!structure?.blocks) return 0;
  return structure.blocks.filter(
    (b) => b.type === 'question' && (b.solution?.html || b.subQuestions?.some((sq) => sq.solution?.html))
  ).length;
};
