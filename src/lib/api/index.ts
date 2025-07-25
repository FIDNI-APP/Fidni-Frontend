// Re-export everything from each module
import {api} from './apiClient';

// Auth exports
export { login, logout, register, getCurrentUser, shouldCompleteProfile } from './authApi';

// User profile exports
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
  saveOnboardingProfile
} from './userApi';

// Exam exports
export {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  voteExam,
  addExamComment,
  markExamViewed
} from './examApi';

// Content exports
export {
  getContents,
  createContent,
  getContentById,
  updateContent,
  deleteContent,
  markContentViewed,
  markExerciseProgress,
  removeExerciseProgress,
  saveExercise,
  unsaveExercise,
  uploadImage
} from './contentApi';

// Lessons exports
export {
  getLessons,
  createLesson,
  getLessonById,
  updateLesson,
  deleteLesson,
  voteLesson,
  addLessonComment,
  markLessonViewed
} from './contentApi';

// Hierarchy exports
export {
  getClassLevels,
  getSubjects,
  getSubfields,
  getChapters,
  getTheorems
} from './hierarchyApi';

// Interaction exports
export {
  voteExercise,
  voteSolution,
  voteComment,
  getSolution,
  updateSolution,
  deleteSolution,
  addSolution,
  addComment,
  updateComment,
  deleteComment
} from './interactionApi';

// Notebooks exports
export {
  getUserNotebooks,
  getNotebookById,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  addChapterToNotebook,
  addLessonToNotebook,
  removeFromNotebook,
  updateLessonNotes,
  getNotebookActivity
} from './notebookApi';

export {
  getLearningPaths,
  startLearningPath,
  getPathChapters,
  getPathChapter,
  createLearningPath,
  updateLearningPath,
  updatePathChapter,
  createPathChapter,
  getLearningPath,
  deleteLearningPath,
  deletePathChapter,
  startChapter,
  updateVideoProgress,
} from './LearningPathApi';
// Export the API client itself
export default api;