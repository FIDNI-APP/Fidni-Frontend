export type Difficulty = 'easy' | 'medium' | 'hard';
export type SortOption = 'newest' | 'oldest' | 'most_upvoted' | 'most_commented';
export type VoteValue = 1 | -1 | 0;
export type CompleteValue = 'success' | 'review';


export interface ClassLevelModel {
  id: string;
  name: string;
}

export interface SubjectModel {
  id: string;
  name: string;
  class_level: ClassLevelModel;
}


export interface Subfield{
  id : string;
  name : string;
  subject : SubjectModel ;
  class_level : ClassLevelModel[];
}

export interface ChapterModel {
  id: string;
  name: string;
  subject: SubjectModel;
  class_level: ClassLevelModel[];
  subfield : Subfield[];
  order: number;
}
export interface Theorem{
  id: string;
  name: string;
  subject: SubjectModel;
  class_level: ClassLevelModel[];
  chapter : ChapterModel[];
  subfield : Subfield[];
}

export interface Solution {
  id: string;
  content: Content;
  author: User;
  created_at: string;
  updated_at: string;
  upvotes_count: number;
  downvotes_count: number;
  user_vote: VoteValue;
  vote_count: number;
}




export interface Content {
  id: string;
  title: string;
  content: string;
  class_levels: ClassLevelModel[];
  subject: SubjectModel;
  chapters: ChapterModel[];
  difficulty: Difficulty;
  author: User;
  created_at: string;
  updated_at: string;
  user_vote: VoteValue;
  vote_count: number;
  solution?:  Solution;  
  comments: Comment[];
  view_count: number;
  theorems : Theorem[];
  subfields : Subfield[];
  user_save: boolean;
  user_complete: CompleteValue;
}

// src/types/index.ts

// Update the User interface
export interface User {
  id: string;
  username: string;
  email: string;
  joinedAt: string;
  profile: UserProfile;
  is_self?: boolean;
  isAuthenticated: boolean;

}

// Create or update the UserProfile interface
export interface SubjectGrade {
  id: string;
  subject: string;
  min_grade: number;
  max_grade: number;
}

// Updated UserProfile interface with subject_grades
export interface UserProfile {
  bio: string;
  avatar: string;
  favorite_subjects: string[];
  location: string;
  last_activity_date: string;
  joined_at: string;
  class_level: {
    id: string;
    name: string;
  } | null;
  user_type: 'student' | 'teacher';
  onboarding_completed: boolean;
  
  // Subject grades for tracking academic performance
  subject_grades: SubjectGrade[];
  
  // Settings
  display_email: boolean;
  display_stats: boolean;
  email_notifications: boolean;
  comment_notifications: boolean;
  solution_notifications: boolean;
  
  // Stats (may be conditionally available)
  contribution_stats?: {
    exercises: number;
    solutions: number;
    comments: number;
    total_contributions: number;
    upvotes_received: number;
    view_count: number;
  };
  learning_stats?: {
    exercises_completed: number;
    exercises_in_review: number;
    exercises_saved: number;
    subjects_studied: string[];
    total_viewed: number;
  };
}

// Define GradePrediction type for future ML implementations
export interface GradePrediction {
  subjectId: string;
  subjectName: string;
  currentAverage: number;
  predictedGrade: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  recommendedExercises?: string[];
}

// Add types for user history
export interface ViewHistoryItem {
  content_type: string;
  content: Content;
  viewed_at: string;
  time_spent?: number;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  created_at: string;
  updated_at: string;
  user_vote: VoteValue;
  parent_id?: string;
  replies?: Comment[];
  vote_count: number;
}

export interface UserProfile {
  bio: string;
  avatar: string;
  favorite_subjects: string[];
  location: string;
  last_activity_at: string;
  joined_at: string;
  
  // New fields
  user_type: 'student' | 'teacher';
  class_level_id: string; 
  interested_subjects: string[];
  subject_marks: Record<string, { highest: number; lowest: number }>;
  
  // Settings
  display_email: boolean;
  display_stats: boolean;
  email_notifications: boolean;
  comment_notifications: boolean;
  solution_notifications: boolean;
  
  // Stats (may be conditionally available)
  contribution_stats?: {
    exercises: number;
    solutions: number;
    comments: number;
    total_contributions: number;
    upvotes_received: number;
    view_count: number;
  };
  learning_stats?: {
    exercises_completed: number;
    exercises_in_review: number;
    exercises_saved: number;
    subjects_studied: string[];
    total_viewed: number;
  };
}


export interface Lesson {
  id: string;
  title: string;
  content: string;
  class_levels: ClassLevelModel[];
  subject: SubjectModel;
  chapters: ChapterModel[];
  author: User;
  created_at: string;
  updated_at: string;
  user_vote: VoteValue;
  vote_count: number;
  comments: Comment[];
  view_count: number;
  theorems : Theorem[];
}
