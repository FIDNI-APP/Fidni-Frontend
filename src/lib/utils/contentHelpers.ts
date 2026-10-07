import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';

export const countQuestionsWithSolutions = (structure: FlexibleExerciseStructure | null | undefined): number => {
  if (!structure?.blocks) return 0;
  return structure.blocks.filter(
    (b) => b.type === 'question' && (b.solution?.html || b.subQuestions?.some((sq) => sq.solution?.html))
  ).length;
};

/**
 * Chemins des questions qu'on évalue (même format que QuestionProgress.question_path) : l'id d'une question
 * sans sous-questions, sinon « <question>.<sous-question> » pour chacune.
 */
export const assessablePaths = (structure: FlexibleExerciseStructure | null | undefined): string[] => {
  const paths: string[] = [];
  for (const b of structure?.blocks ?? []) {
    if (b.type !== 'question') continue;
    if (b.subQuestions?.length) b.subQuestions.forEach((sq) => paths.push(`${b.id}.${sq.id}`));
    else paths.push(b.id);
  }
  return paths;
};
