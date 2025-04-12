// Re-export everything from each module
import api from './apiClient';

// Auth exports
export { login, logout, register, getCurrentUser } from './authApi';

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

// Content exports
export {
  getContents,
  createContent,
  getContentById,
  updateContent,
  deleteContent,
  markContentViewed,
  markContentCompleted,
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

// Export the API client itself
export default api;