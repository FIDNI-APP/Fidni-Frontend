export type Difficulty = 'easy' | 'medium' | 'hard';
export type SortOption = 'newest' | 'oldest' | 'most_upvoted' | 'most_commented';
export type VoteValue = 1 | -1 | 0;



export interface ClassLevelModel {
  id: string;
  name: string;
}

export interface SubjectModel {
  id: string;
  name: string;
  class_level: number[];
}


export interface Subfield{
  id : string;
  name : string;
  subject : string ;
  class_level : ClassLevelModel[];
}

export interface ChapterModel {
  id: string;
  name: string;
  subject: number;
  class_level: ClassLevelModel[];
  subfield : Subfield[];
  order: number;
}
export interface Theorem{
  id: string;
  name: string;
  subject: number;
  class_level: ClassLevelModel[];
  chapter : ChapterModel[];
  subfield : Subfield[];
}

export interface Solution {
  id: string;
  content: string;
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
}

export interface User {
  id: string;
  username: string;
  email: string;
  isAuthenticated: boolean;
  avatar?: string;
  bio?: string;
  joinedAt: string;
  contributionsCount: number;
  reputation: number;
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
  user: User;
  contributions: Content[];
  favoriteSubjects: string[];
  recentActivity: {
    type: 'comment' | 'post' | 'vote';
    content: Content;
    timestamp: string;
  }[];
  stats: {
    totalContributions: number;
    totalUpvotes: number;
    totalComments: number;
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