/**
 * Centralized API Exports
 *
 * Single source of truth for all API functions.
 * Uses factory pattern to eliminate duplication.
 */

import { api } from './apiClient';

// ============ CORE API CLIENT ============
export { api };
export default api;

// ============ CONTENT API (Factory-based) ============
export {
  exerciseAPI,
  examAPI,
  lessonAPI,
  getContentAPI,
  type VoteValue,
  type ProgressStatus,
  type ContentType,
  type BaseContentQueryParams,
  type ContentListResponse,
} from './contentApiFactory';

// ============ EXERCISE API ============
export {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  voteExercise,
  addExerciseComment,
  markExerciseViewed,
  markExerciseProgress,
  removeExerciseProgress,
  saveExercise,
  unsaveExercise,
  // Exercise-specific
  addSolution,
  getSolution,
  updateSolution,
  deleteSolution,
  voteSolution,
  uploadImage,
  type ExerciseData,
} from './exerciseApiExtensions';

export { getFilterCounts } from './contentApi';

// ============ EXAM API ============
export {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  voteExam,
  addExamComment,
  markExamViewed,
  markExamProgress,
  removeExamProgress,
  saveExam,
  unsaveExam,
  type ExamQueryParams,
  type ExamData,
} from './examApiExtensions';

// ============ LESSON API ============
export {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  voteLesson,
  addLessonComment,
  markLessonViewed,
  markLessonProgress,
  removeLessonProgress,
  saveLesson,
  unsaveLesson,
  type LessonData,
} from './lessonApiExtensions';

// ============ AUTH API ============
export {
  login,
  logout,
  register,
  getCurrentUser,
  shouldCompleteProfile,
} from './authApi';

// ============ USER API ============
export {
  updateUserProfile,
  saveUserSubjectGrades,
  saveUserType,
  getUserProfile,
  getUserStats,
  getUserContributions,
  getUserSavedExercises,
  getUserProgressExercises,
  getUserHistory,
  checkOnboardingStatus,
  getOnboardingData,
  saveOnboardingProfile,
} from './userApi';

// ============ HIERARCHY API ============
export {
  getClassLevels,
  getSubjects,
  getSubfields,
  getChapters,
  getTheorems,
} from './hierarchyApi';

// ============ INTERACTION API ============
export {
  voteComment,
  addComment,
  updateComment,
  deleteComment,
  saveTimeSpent,
  getTimeSpent,
  saveSession,
  getSessionHistory,
  autoSaveTimeSpent,
  type TimeSession,
} from './interactionApi';

// ============ NOTEBOOK API ============
export {
  getUserNotebooks,
  getNotebookById,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  addChapterToNotebook,
  addLessonToNotebook,
  removeFromNotebook,
  updateChapterNotes,
  getNotebookActivity,
} from './notebookApi';

// ============ LEARNING PATH API ============
export {
  getLearningPaths,
  getLearningPath,
  startLearningPath,
  createLearningPath,
  updateLearningPath,
  deleteLearningPath,
  getPathChapters,
  getPathChapter,
  createPathChapter,
  updatePathChapter,
  deletePathChapter,
  startChapter,
  updateVideoProgress,
} from './LearningPathApi';

// ============ REVISION LISTS API ============
export {
  getRevisionLists,
  getRevisionList,
  createRevisionList,
  updateRevisionList,
  deleteRevisionList,
  addItemToRevisionList,
  removeItemFromRevisionList,
  getRevisionListStatistics,
  type RevisionList,
  type RevisionListItem,
  type CreateRevisionListData,
  type AddItemData,
  type RevisionListStatistics,
} from './revisionListApi';

// ============ DASHBOARD API ============
export {
  getUserDashboardStats,
  getLearningPathProgress,
  getRecommendedContent,
  type DashboardStats,
  type LearningPathStep,
  type LearningPathProgress,
  type RecommendedContent,
} from './dashboardApi';

// ============ LEGACY ALIASES (for backwards compatibility) ============
// Remove these gradually as you update imports throughout the app

/** @deprecated Use getExercises instead */
export { getExercises as getContents } from './exerciseApiExtensions';

/** @deprecated Use getExerciseById instead */
export { getExerciseById as getContentById } from './exerciseApiExtensions';

/** @deprecated Use createExercise instead */
export { createExercise as createContent } from './exerciseApiExtensions';

/** @deprecated Use updateExercise instead */
export { updateExercise as updateContent } from './exerciseApiExtensions';

/** @deprecated Use deleteExercise instead */
export { deleteExercise as deleteContent } from './exerciseApiExtensions';

/** @deprecated Use markExerciseViewed instead */
export { markExerciseViewed as markContentViewed } from './exerciseApiExtensions';
