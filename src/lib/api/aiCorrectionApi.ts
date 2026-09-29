/**
 * Correction IA (superuser only).
 * Photo d'une copie manuscrite → verdict par question, comparé aux solutions.
 */
import { api } from './apiClient';

export interface AIVerdict {
  path: string;
  label?: string;
  verdict: 'success' | 'partial' | 'failed' | 'not_attempted';
  comment: string;
}

export interface AICorrectionResult {
  correction_id: string;
  score_awarded: number;
  score_total: number;
  per_question: AIVerdict[];
  global_feedback: string;
  processing_time_ms: number;
}

export const aiCorrectionAPI = {
  /** Envoie une photo et récupère le verdict par question. */
  correct: async (contentId: string, image: File): Promise<AICorrectionResult> => {
    const form = new FormData();
    form.append('image', image);
    const r = await api.post(`/contents/${contentId}/ai_correct/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },
};
