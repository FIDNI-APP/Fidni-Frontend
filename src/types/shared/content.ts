/**
 * Shared types for content management across exercises, exams, and lessons
 */

export type ProgressStatus = 'success' | 'review' | null;

export interface LoadingStates {
  progress: boolean;
  save: boolean;
}

export interface ContentMetadata {
  viewCount: number;
  voteCount: number;
  commentsCount: number;
}

export interface TimerState {
  currentTime: number;
  isRunning: boolean;
  formatTime: (seconds: number) => string;
}

export interface SidebarProps extends TimerState {
  timer: number;
  timerActive: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  difficultyRating: number | null;
  rateDifficulty: (rating: number) => void;
  viewCount: number;
  voteCount: number;
  commentsCount: number;
}

export interface ToolbarProps {
  showToolbar: boolean;
  toggleToolbar: () => void;
  timerActive: boolean;
  toggleTimer: () => void;
  timer: number;
  fullscreenMode: boolean;
  toggleFullscreen: () => void;
  savedForLater: boolean;
  toggleSavedForLater: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

export interface UIControlState {
  fullscreenMode: boolean;
  showToolbar: boolean;
  isSticky: boolean;
  showPrint: boolean;
}
