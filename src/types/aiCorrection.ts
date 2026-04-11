/**
 * AI Correction Types
 * Types for AI-powered solution correction feature
 */

export interface AICorrection {
  id: string;
  user: {
    id: string;
    username: string;
  };
  image: string;
  image_url: string;
  submitted_at: string;
  conversation_started_at: string | null;
  submission_state: 'pre_submission' | 'submitted' | 'discussed';
  language: string;
  ai_provider: string;
  ai_model: string;
  score_awarded: number | null;
  score_total: number | null;
  feedback: FeedbackData;
  raw_response: string;
  processing_time_ms: number | null;
  chat_history: ChatMessage[];
  pedagogical_context: PedagogicalContext;
}

export interface FeedbackData {
  [questionId: string]: QuestionFeedback;
  overall_comment?: string;
}

export interface QuestionFeedback {
  status: 'correct' | 'partial' | 'incorrect';
  points: number;
  comment: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string;
}

export interface PedagogicalContext {
  hints_given: { [questionId: string]: number };
  concepts_explained: string[];
}

export type PedagogicalMode = 'hints' | 'concepts' | 'socratic' | 'general';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AICorrectRequestData {
  image: File;
}

export interface AIChatRequestData {
  correction_id: string;
  message: string;
}

export interface AIChatResponse {
  response: string;
  chat_history: ChatMessage[];
}

export interface StartChatResponse {
  correction_id: string;
  greeting_message: string;
  exercise_info: {
    total_points: number;
  };
}

export interface PedagogicalChatRequest {
  correction_id: string;
  message: string;
  mode: PedagogicalMode;
}

export interface PedagogicalChatResponse {
  response: string;
  chat_history: ChatMessage[];
  pedagogical_context: PedagogicalContext;
}

export interface FileUploadResponse {
  id: string;
  file: string;
  file_name: string;
  file_size: number;
  file_type: 'image' | 'document' | 'video' | 'audio' | 'other';
  mime_type: string;
  url: string;
}
