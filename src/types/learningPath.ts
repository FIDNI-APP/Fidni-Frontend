// src/types/learningPath.ts (mis à jour)
export interface VideoContent {
  id: string;
  title: string;
  url: string;
  duration: string;
  type: 'lesson' | 'summary';
  completed: boolean;
  order: number;
  notes?: string;
  resources?: Resource[];
}

export interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'exercise';
  url: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface ChapterProgress {
  id: string;
  number: string;
  title: string;
  description: string;
  videos: VideoContent[];
  quiz: Quiz[];
  completed: boolean;
  locked: boolean;
  progress: number;
  estimatedTime: string;
  prerequisites?: string[];
  achievements?: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface SubjectProgress {
  id: string;
  name: string;
  progress: number;
  totalChapters: number;
  completedChapters: number;
  chapters: ChapterProgress[];
  estimatedTime: string;
  nextChapter?: ChapterProgress;
  achievements: Achievement[];
}

export interface LearningPathStats {
  totalProgress: number;
  currentStreak: number;
  longestStreak: number;
  totalTimeSpent: number;
  completedChapters: number;
  totalChapters: number;
  quizAverage: number;
  level: number;
  experience: number;
  nextLevelExperience: number;
}