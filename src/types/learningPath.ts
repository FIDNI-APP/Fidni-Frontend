export interface Video {
  id: string;
  title: string;
  duration: string; // "15m", "1h 30m"
  completed: boolean;
  type: 'lesson' | 'lab' | 'exam';
}

export interface Chapter {
  id: string;
  number: string; // "1.1", "2.3"
  title: string;
  duration: string;
  videos: Video[];
  completed: boolean;
  locked?: boolean;
}

export interface Subject {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
  progress: number; // 0-100
  totalDuration: string;
  nextUp?: Chapter;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  userAnswer?: number;
}