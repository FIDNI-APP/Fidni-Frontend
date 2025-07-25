// src/stores/learningPathStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  LearningPath, 
  PathChapter, 
  Video,
  UserVideoProgress 
} from '@/types/index';

interface LearningPathState {
  // Current path data
  currentPath: LearningPath | null;
  currentChapter: PathChapter | null;
  currentVideo: Video | null;
  
  // Progress tracking
  videoProgress: Record<string, UserVideoProgress>;
  
  // Actions
  setCurrentPath: (path: LearningPath | null) => void;
  setCurrentChapter: (chapter: PathChapter | null) => void;
  setCurrentVideo: (video: Video | null) => void;
  updateVideoProgress: (videoId: string, progress: Partial<UserVideoProgress>) => void;
  resetProgress: () => void;
}

export const useLearningPathStore = create<LearningPathState>()(
  persist(
    (set) => ({
      currentPath: null,
      currentChapter: null,
      currentVideo: null,
      videoProgress: {},
      
      setCurrentPath: (path) => set({ currentPath: path }),
      setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
      setCurrentVideo: (video) => set({ currentVideo: video }),
      
      updateVideoProgress: (videoId, progress) => 
        set((state) => ({
          videoProgress: {
            ...state.videoProgress,
            [videoId]: {
              ...state.videoProgress[videoId],
              ...progress
            }
          }
        })),
      
      resetProgress: () => set({
        currentPath: null,
        currentChapter: null,
        currentVideo: null,
        videoProgress: {}
      })
    }),
    {
      name: 'learning-path-storage'
    }
  )
);